// The resolver that makes "validator-neutral" structural rather than
// demonstrated.
//
// Before this file there were two resolvers and the neutrality claim rested on
// the fact that a second one could be written. Here both members come from
// specs this package does not own — `fields` from `~standard.jsonSchema`,
// `validate` from `~standard.validate` — so a vendor that implements them is
// supported without a file being added.
//
// The validators below are HAND-WRITTEN objects rather than a real library,
// and deliberately so. The point of each is a shape the spec permits, and a
// real vendor only ever demonstrates the one shape it picked: the three issue
// path spellings, a converter that throws, a converter that declares nothing,
// and an async verdict do not all co-occur in any installed package. zod and
// luq cover the real-vendor side in their own files.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  standardFormResolver,
  forgetUndescribedFormWarnings,
} from "@maroonedog/waypoint/resolver-standard";
import { createForm, errorCountCell } from "@maroonedog/waypoint/core";

const DOCUMENT = {
  type: "object",
  properties: {
    owner: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 3, title: "Full name" },
        nickname: { type: "string" },
      },
      required: ["name"],
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { sku: { type: "string", minLength: 2 } },
        required: ["sku"],
      },
    },
  },
  required: ["owner"],
};

/** A validator carrying both halves, with whatever verdict a test needs. */
const bothHalves = (issues = [], { target, throws } = {}) => ({
  "~standard": {
    version: 1,
    vendor: "example",
    validate: () => (issues.length === 0 ? { value: {} } : { issues }),
    jsonSchema: {
      input: (options) => {
        if (throws !== undefined) throw new Error(throws);
        if (target !== undefined && options.target !== target) {
          throw new Error(`Unsupported JSON Schema target: ${options.target}`);
        }
        return DOCUMENT;
      },
    },
  },
});

/** A validator that judges and says nothing about JSON Schema. */
const validateOnly = (issues = []) => ({
  "~standard": {
    version: 1,
    vendor: "judge-only",
    validate: () => (issues.length === 0 ? { value: {} } : { issues }),
  },
});

/** Runs `run` with the host console captured, and returns what it printed. */
const capturedWarnings = (run) => {
  forgetUndescribedFormWarnings();
  const original = console.warn;
  const lines = [];
  console.warn = (line) => lines.push(line);
  try {
    run();
  } finally {
    console.warn = original;
  }
  return lines;
};

/** The same capture, for a test that wants the value rather than the line. */
const withoutWarnings = (run) => {
  let produced;
  capturedWarnings(() => {
    produced = run();
  });
  return produced;
};

const pathsOf = (adapter) => adapter.fields.map((field) => field.path);

test("a validator with both halves gets descriptors and issues from the specs", () => {
  const adapter = standardFormResolver(
    bothHalves([{ message: "too short", path: ["owner", "name"] }])
  );
  assert.deepEqual(pathsOf(adapter), [
    "owner.name",
    "owner.nickname",
    "items[*].sku",
  ]);
  assert.deepEqual(adapter.fields[0], {
    path: "owner.name",
    kind: "string",
    isRequired: true,
    label: "Full name",
    constraints: { minLength: 3 },
  });
  assert.deepEqual(adapter.validate({}), [
    { path: "owner.name", message: "too short" },
  ]);
});

test("an acceptable root produces no issues", () => {
  assert.deepEqual(standardFormResolver(bothHalves()).validate({}), []);
});

test("a validator with only `~standard` still judges, and declares no fields", () => {
  // The compiler stops this call — the unary overload wants `jsonSchema` and
  // this vendor has none — so reaching it at all means JavaScript, or a cast.
  // What it must NOT do is fail: the verdict is the half that keeps a form
  // honest, and it is intact.
  const adapter = withoutWarnings(() =>
    standardFormResolver(
      validateOnly([{ message: "nope", path: ["owner", "name"] }])
    )
  );
  assert.deepEqual(adapter.fields, []);
  assert.deepEqual(adapter.validate({}), [
    { path: "owner.name", message: "nope" },
  ]);
});

test("a caller may supply the fields a validator could not describe", () => {
  const declared = [
    { path: "owner.name", kind: "string", isRequired: true, constraints: {} },
  ];
  const adapter = standardFormResolver(validateOnly(), { fields: declared });
  assert.deepEqual(adapter.fields, declared);
});

// ---------------------------------------------------------------------------
// The degradation signal. Three states that used to be one empty list.
// ---------------------------------------------------------------------------

test("declaring no JSON Schema is distinguishable from declaring an empty one", () => {
  // This is the distinction the change exists to make. Both end with no
  // fields; they are different bugs with different fixes, so they get
  // different sentences.
  const [undeclared] = capturedWarnings(() =>
    standardFormResolver(validateOnly())
  );
  const [empty] = capturedWarnings(() =>
    standardFormResolver({
      "~standard": {
        version: 1,
        vendor: "empty-vendor",
        validate: () => ({ value: {} }),
        jsonSchema: { input: () => ({ type: "object", properties: {} }) },
      },
    })
  );

  assert.match(undeclared, /declares no JSON Schema/);
  assert.match(empty, /produced a JSON Schema with no fields in it/);
  assert.notEqual(undeclared, empty);
  for (const line of [undeclared, empty]) {
    assert.match(line, /validate correctly and draw nothing/);
  }
});

test("a converter that throws is reported with the reason it gave", () => {
  const [line] = capturedWarnings(() =>
    standardFormResolver(bothHalves([], { throws: "Date cannot be represented" }))
  );
  assert.match(line, /"example"/);
  assert.match(line, /could not produce one: Date cannot be represented/);
  // The escape hatch is named, because the option is vendor-specific and a
  // reader who does not know it exists cannot go looking for it.
  assert.match(line, /libraryOptions/);
});

test("identical reasons from both targets are said once", () => {
  const [line] = capturedWarnings(() =>
    standardFormResolver(bothHalves([], { throws: "the same problem" }))
  );
  assert.equal(line.match(/the same problem/g).length, 1);
});

test("the signal does not fire when a document was produced", () => {
  assert.deepEqual(
    capturedWarnings(() => standardFormResolver(bothHalves())),
    []
  );
});

test("the signal does not fire when the caller supplied the fields", () => {
  // A caller who states the fields has answered the question the warning asks.
  assert.deepEqual(
    capturedWarnings(() =>
      standardFormResolver(validateOnly(), {
        fields: [
          { path: "name", kind: "string", isRequired: true, constraints: {} },
        ],
      })
    ),
    []
  );
});

test("the signal is said once per vendor and state, not once per form", () => {
  const lines = capturedWarnings(() => {
    standardFormResolver(validateOnly());
    standardFormResolver(validateOnly());
    standardFormResolver(validateOnly());
  });
  assert.equal(lines.length, 1);
});

// ---------------------------------------------------------------------------
// Target negotiation.
// ---------------------------------------------------------------------------

test("a vendor that speaks only draft-07 is asked again rather than given up on", () => {
  const adapter = standardFormResolver(bothHalves([], { target: "draft-07" }));
  assert.deepEqual(pathsOf(adapter), [
    "owner.name",
    "owner.nickname",
    "items[*].sku",
  ]);
});

test("libraryOptions reaches the converter verbatim and is never invented", () => {
  const seen = [];
  const schema = {
    "~standard": {
      version: 1,
      vendor: "watchful",
      validate: () => ({ value: {} }),
      jsonSchema: {
        input: (options) => {
          seen.push(options);
          return DOCUMENT;
        },
      },
    },
  };

  standardFormResolver(schema);
  assert.deepEqual(Object.keys(seen[0]), ["target"], "nothing was invented");

  seen.length = 0;
  standardFormResolver(schema, { libraryOptions: { unrepresentable: "any" } });
  assert.deepEqual(seen[0], {
    target: "draft-2020-12",
    libraryOptions: { unrepresentable: "any" },
  });
});

// ---------------------------------------------------------------------------
// Issue paths. The one place the spec leaves vendors a real choice.
// ---------------------------------------------------------------------------

const pathOf = (path) =>
  standardFormResolver(bothHalves([{ message: "m", path }])).validate({})[0]
    .path;

test("an issue inside an array names the real index, not the wildcard", () => {
  assert.equal(pathOf(["items", 2, "sku"]), "items[2].sku");
});

test("a nested issue is addressed with dots", () => {
  assert.equal(pathOf(["owner", "name"]), "owner.name");
});

test("the object spelling of a path segment is unwrapped", () => {
  // The spec permits `{ key }` objects as well as bare keys, and vendors
  // differ. One formatter handles both, so no resolver has to know which it
  // was handed.
  assert.equal(
    pathOf([{ key: "items" }, { key: 2 }, { key: "sku" }]),
    "items[2].sku"
  );
  assert.equal(pathOf([{ key: "owner" }, { key: "name" }]), "owner.name");
});

test("the two spellings may be mixed in one path", () => {
  assert.equal(pathOf(["items", { key: 0 }, "sku"]), "items[0].sku");
});

test("an issue with no path lands on the root rather than throwing", () => {
  // A rule comparing two fields can report against neither.
  assert.equal(pathOf(undefined), "");
});

test("a symbol segment is dropped rather than stringified", () => {
  // It cannot be spelled in a path a form addresses, and `Symbol(x)` in one
  // would name a field that does not exist.
  assert.equal(pathOf(["owner", Symbol("hidden"), "name"]), "owner.name");
});

test("an issue with no message still says something a renderer can draw", () => {
  const [issue] = standardFormResolver(
    bothHalves([{ path: ["owner", "name"] }])
  ).validate({});
  assert.equal(issue.path, "owner.name");
  assert.equal(typeof issue.message, "string");
  assert.notEqual(issue.message, "");
});

test("no code is invented, because the spec has no member for one", () => {
  const [issue] = standardFormResolver(
    bothHalves([{ message: "m", path: ["owner", "name"], code: "too_small" }])
  ).validate({});
  assert.equal("code" in issue, false);
  assert.deepEqual(Object.keys(issue).sort(), ["message", "path"]);
});

// ---------------------------------------------------------------------------
// Async. `~standard.validate` is allowed to return a promise.
// ---------------------------------------------------------------------------

const asyncSchema = (issues) => ({
  "~standard": {
    version: 1,
    vendor: "slow",
    validate: () =>
      Promise.resolve(issues.length === 0 ? { value: {} } : { issues }),
    jsonSchema: { input: () => DOCUMENT },
  },
});

test("an async verdict is passed on as a promise rather than awaited here", async () => {
  const adapter = standardFormResolver(
    asyncSchema([{ message: "taken", path: ["owner", "name"] }])
  );
  const outcome = adapter.validate({});
  assert.equal(typeof outcome.then, "function");
  assert.deepEqual(await outcome, [
    { path: "owner.name", message: "taken" },
  ]);
});

test("a synchronous vendor stays synchronous end to end", () => {
  // `MaybeAsync` is a union and not a promise precisely so that the common
  // case does not get a microtask between a keystroke and the verdict.
  const outcome = standardFormResolver(bothHalves()).validate({});
  assert.equal(Array.isArray(outcome), true);
});

test("the runtime drives an async standard adapter to a settled verdict", async () => {
  const form = createForm({
    adapter: standardFormResolver(
      asyncSchema([{ message: "taken", path: ["owner", "name"] }])
    ),
    defaultValues: { owner: { name: "Ada", nickname: "" }, items: [] },
  });
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 1);
  assert.equal(
    form.field("owner.name").sources.issues.read()[0].message,
    "taken"
  );
  assert.equal(form.field("owner.name").descriptor.constraints.minLength, 3);
});
