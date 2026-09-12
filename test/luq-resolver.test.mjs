// luq no longer reaches the contract by a road of its own, and that is the
// change this file now records. Both resolvers get their descriptors from the
// same place — the generic walk over `~standard.jsonSchema` — so the two roads
// this file used to contrast have become one, and neutrality is a property of
// the build rather than of there being two implementations.
//
// What is left vendor-specific here is the VERDICT, and only because the spec
// has no room for it. `StandardSchemaV1.Issue` has `message` and `path` and no
// `code`; luq's own bridge says so in its source and drops both `code` and
// `severity` on the way into the spec. The tests below that assert on
// `code: "stringMin"` are the reason resolver-luq still exists.
//
// The resolver is UNARY now. `toStandardJsonSchema(validator)` returns one
// object carrying luq's native `validate` AND the spec's two members, so there
// was never a second argument to pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Builder } from "@maroonedog/luq";
import { requiredPlugin } from "@maroonedog/luq/plugins/required";
import { optionalPlugin } from "@maroonedog/luq/plugins/optional";
import { objectPlugin } from "@maroonedog/luq/plugins/object";
import { stringMinPlugin } from "@maroonedog/luq/plugins/stringMin";
import { stringMaxPlugin } from "@maroonedog/luq/plugins/stringMax";
import { numberMinPlugin } from "@maroonedog/luq/plugins/numberMin";
import { numberMaxPlugin } from "@maroonedog/luq/plugins/numberMax";
import { toStandardJsonSchema } from "@maroonedog/luq/standard-schema";
import { luqFormResolver } from "@maroonedog/form-contract/resolver-luq";
import { createForm, errorCountCell } from "@maroonedog/form-contract/core";

const build = () =>
  Builder()
    .use(requiredPlugin)
    .use(optionalPlugin)
    .use(objectPlugin)
    .use(stringMinPlugin)
    .use(stringMaxPlugin)
    .use(numberMinPlugin)
    .use(numberMaxPlugin)
    .for()
    .v("owner", (one) => one.object.required())
    .v("owner.name", (one) => one.string.required().min(3).max(20))
    .v("owner.nickname", (one) => one.string.optional())
    .v("quantity", (one) => one.number.required().min(1).max(99))
    .build();

const adapterOf = () => luqFormResolver(toStandardJsonSchema(build()));

const GOOD = { owner: { name: "Ada Lovelace", nickname: "" }, quantity: 2 };

const descriptorAt = (adapter, path) =>
  adapter.fields.find((field) => field.path === path);

test("a leaf is described before any value exists", () => {
  const name = descriptorAt(adapterOf(), "owner.name");
  assert.deepEqual(name, {
    path: "owner.name",
    kind: "string",
    isRequired: true,
    constraints: { minLength: 3, maxLength: 20 },
  });
});

test("presence comes from the schema's required list, not from the value", () => {
  const adapter = adapterOf();
  assert.equal(descriptorAt(adapter, "owner.name").isRequired, true);
  assert.equal(descriptorAt(adapter, "owner.nickname").isRequired, false);
});

test("a numeric bound arrives as a bound and not as a string", () => {
  const quantity = descriptorAt(adapterOf(), "quantity");
  assert.equal(quantity.kind, "number");
  assert.deepEqual(quantity.constraints, { minimum: 1, maximum: 99 });
});

test("a container contributes no descriptor of its own", () => {
  const paths = adapterOf().fields.map((field) => field.path);
  assert.deepEqual(paths.sort(), ["owner.name", "owner.nickname", "quantity"]);
});

// A draft-07 document written here rather than asked of luq. This resolver is
// written against the FORMAT, not against luq's internals, and luq has no
// keyword today that emits `title` or `description` — so a test that went
// through the builder could only prove the members are absent. Handing the
// resolver the document directly tests the mapping that a luq release adding
// those keywords, or any other producer of draft-07, would exercise.
const describableDocument = (document) => ({
  "~standard": {
    version: 1,
    vendor: "luq",
    validate: () => ({}),
    jsonSchema: { input: () => document },
  },
  // luq's own judging method travels on the same object as the spec's two
  // members — `toStandardJsonSchema` returns one value carrying both — which
  // is why this resolver is unary. These two tests only read descriptors, so
  // this one has nothing to say.
  validate: () => ({ valid: true, issues: [] }),
});

const ANNOTATED = {
  type: "object",
  properties: {
    owner: {
      type: "object",
      properties: {
        name: {
          type: "string",
          title: "Full name",
          description: "as it appears on the card",
          minLength: 3,
        },
        nickname: { type: "string" },
      },
      required: ["name"],
    },
  },
  required: ["owner"],
};

test("a document's own title and description reach the descriptor", () => {
  const adapter = luqFormResolver(describableDocument(ANNOTATED));
  assert.deepEqual(descriptorAt(adapter, "owner.name"), {
    path: "owner.name",
    kind: "string",
    isRequired: true,
    label: "Full name",
    description: "as it appears on the card",
    constraints: { minLength: 3 },
  });
});

test("an unannotated field carries neither member, rather than undefined ones", () => {
  // The sibling in the same document says nothing, so the descriptor says
  // nothing — no name is derived from `owner.nickname`, because choosing the
  // wording and the language of that text is the application's job.
  const adapter = luqFormResolver(describableDocument(ANNOTATED));
  const nickname = descriptorAt(adapter, "owner.nickname");
  assert.equal("label" in nickname, false);
  assert.equal("description" in nickname, false);
  assert.deepEqual(Object.keys(nickname).sort(), [
    "constraints",
    "isRequired",
    "kind",
    "path",
  ]);
});

test("an acceptable root produces no issues", () => {
  assert.deepEqual(adapterOf().validate(GOOD), []);
});

test("every issue is reported, not just the first", () => {
  // The contract's whole-root pass scatters the verdict onto every path it
  // names. A resolver that stopped at the first failure would report one
  // field and silently clear the others.
  const issues = adapterOf().validate({ owner: { name: "a" }, quantity: 0 });
  assert.deepEqual(
    issues.map((issue) => issue.path).sort(),
    ["owner.name", "quantity"]
  );
});

test("an issue is addressed at the path it belongs to, with its code", () => {
  const issues = adapterOf().validate({ ...GOOD, owner: { name: "a" } });
  const [first] = issues;
  assert.equal(first.path, "owner.name");
  assert.equal(first.code, "stringMin");
  assert.match(first.message, /3/);
});

test("the runtime drives a luq adapter exactly as it drives a zod one", async () => {
  const form = createForm({
    adapter: adapterOf(),
    defaultValues: structuredClone(GOOD),
  });
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 0);

  form.field("owner.name").setValue("a");
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 1);
  assert.equal(
    form.field("owner.name").sources.issues.read()[0].code,
    "stringMin"
  );

  // And the descriptor reached the field handle, which is what a renderer
  // draws from before anybody types.
  assert.equal(form.field("owner.name").descriptor.constraints.minLength, 3);
});

test("a warning is graded out, because luq grades and the spec does not", () => {
  // A warning that blocked a submit would be a warning that is an error. The
  // spec has no severity at all, so this is the other thing only the vendor
  // can say.
  const graded = {
    "~standard": {
      version: 1,
      vendor: "luq",
      validate: () => ({}),
      jsonSchema: { input: () => ANNOTATED },
    },
    validate: () => ({
      valid: false,
      issues: [
        { path: "owner.name", message: "too short", code: "stringMin", severity: "error" },
        { path: "owner.name", message: "unusual", code: "styleOdd", severity: "warning" },
      ],
    }),
  };
  assert.deepEqual(luqFormResolver(graded).validate({}), [
    { path: "owner.name", message: "too short", code: "stringMin" },
  ]);
});

test("the one object carries both halves, which is why this takes one argument", () => {
  // Asserted rather than described: `toStandardJsonSchema` returns a NEW object
  // whose own `validate` is luq's, with `~standard` beside it.
  const validator = build();
  const describable = toStandardJsonSchema(validator);
  assert.notEqual(describable, validator);
  assert.equal(typeof describable.validate, "function");
  assert.equal(typeof describable["~standard"].jsonSchema.input, "function");
  assert.equal(
    describable.validate({ owner: { name: "a" }, quantity: 2 }, { abortEarly: false })
      .issues[0].code,
    "stringMin"
  );
});
