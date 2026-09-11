// The first vertical slice: two fields, a rule between them, one of them
// behind a toggle that unmounts it. Layer 3 only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // A navigator already provided by the host is fine.
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { zodFormResolver } = await import("form-contract-resolver-zod");
const {
  createForm,
  createCellStore,
  assertFormStoreContract,
  issuesCell,
  readValueAt,
  ROOT_CELL,
} = await import("form-core");
const { FormProvider, Field } = await import("form-react");
const { createZustandCellStore } = await import("form-store-zustand");
const { createStore } = await import("zustand/vanilla");

const { act, createElement: h, useState, Fragment } = React;

const SCHEMA = z
  .object({
    billing: z.object({ postcode: z.string() }),
    shipping: z.object({ postcode: z.string() }),
  })
  .superRefine((value, ctx) => {
    if (value.billing.postcode !== value.shipping.postcode) {
      ctx.addIssue({
        code: "custom",
        message: "must match shipping",
        path: ["billing", "postcode"],
      });
    }
  });

const DEFAULTS = { billing: { postcode: "" }, shipping: { postcode: "" } };

function buildForm(store) {
  return createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
    ...(store === undefined ? {} : { store }),
  });
}

function makeScreen(form, counters) {
  const Input = ({ path, testId }) =>
    h(Field, { path }, (field) => {
      counters[testId] += 1;
      return h(
        Fragment,
        null,
        h("input", { ...field.inputProps, "data-testid": testId }),
        h(
          "span",
          { "data-testid": testId + "-error" },
          field.issues.map((issue) => issue.message).join(" ")
        )
      );
    });

  return function Screen() {
    counters.shell += 1;
    const [showShipping, setShowShipping] = useState(true);
    const [showBilling, setShowBilling] = useState(true);
    return h(
      FormProvider,
      { form },
      h(
        Fragment,
        null,
        showBilling
          ? h(Input, { path: "billing.postcode", testId: "billing" })
          : null,
        showShipping
          ? h(Input, { path: "shipping.postcode", testId: "shipping" })
          : null,
        h("button", {
          "data-testid": "toggle",
          onClick: () => setShowShipping((shown) => !shown),
        }),
        h("button", {
          "data-testid": "toggle-billing",
          onClick: () => setShowBilling((shown) => !shown),
        })
      )
    );
  };
}

const find = (container, testId) =>
  container.querySelector("[data-testid=" + JSON.stringify(testId) + "]");

async function type(container, testId, value) {
  const element = find(container, testId);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

async function renderSlice(store) {
  const counters = { shell: 0, billing: 0, shipping: 0 };
  const form = buildForm(store);
  const Screen = makeScreen(form, counters);
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(h(Screen)));
  return { form, counters, container, root };
}

// 1 - R4
test("typing into one field re-renders only that one component", async () => {
  const { counters, container, root } = await renderSlice();

  // A keystroke that also makes an error appear costs two renders of the field
  // that owns it: one for the value, one for the issues the following pass
  // writes. Neither reaches any other component.
  const before = { ...counters };
  await type(container, "billing", "1");
  assert.equal(counters.billing, before.billing + 2, "value, then issues");
  assert.equal(counters.shipping, before.shipping, "shipping did not re-render");
  assert.equal(counters.shell, before.shell, "the shell did not re-render");

  // A keystroke that leaves the verdict unchanged costs exactly one: the issue
  // list has the same content, so the diff writes no issue cell at all.
  const settled = { ...counters };
  await type(container, "billing", "12");
  assert.equal(counters.billing, settled.billing + 1, "value only");
  assert.equal(counters.shipping, settled.shipping, "shipping did not re-render");
  assert.equal(counters.shell, settled.shell, "the shell did not re-render");
  await act(async () => root.unmount());
});

// 2 - R2, values
test("a rule reads a sibling whose component is not mounted", async () => {
  const { form, container, root } = await renderSlice();
  await type(container, "shipping", "999");
  await act(async () => find(container, "toggle").click());
  assert.equal(find(container, "shipping"), null, "shipping is unmounted");

  await type(container, "billing", "100");
  let issues = [];
  await act(async () => {
    issues = form.field("billing.postcode").validate();
  });
  assert.deepEqual(
    issues.map((i) => i.message),
    ["must match shipping"]
  );

  await type(container, "billing", "999");
  await act(async () => {
    issues = form.field("billing.postcode").validate();
  });
  assert.deepEqual(issues, []);
  await act(async () => root.unmount());
});

// 3 - R2, isolation
// No component is rendered at all. A field addressed by path is reachable
// whether or not React has ever been involved, which is the point.
test("a field validates on its own, and check writes nothing", () => {
  const form = buildForm();
  const adapter = zodFormResolver(SCHEMA);
  form.field("billing.postcode").setValue("100");

  const fromField = form.field("billing.postcode").validate();
  const fromForm = adapter
    .validate(form.readRoot())
    .filter((issue) => issue.path === "billing.postcode");
  assert.deepEqual(fromField, fromForm);

  const rootBefore = JSON.stringify(form.readRoot());
  const probed = form.field("billing.postcode").check("");
  assert.deepEqual(probed, []);
  assert.equal(
    JSON.stringify(form.readRoot()),
    rootBefore,
    "check wrote nothing"
  );
  assert.equal(form.field("billing.postcode").sources.value.read(), "100");
});

// 4 - the cross-field direction
test("editing one field moves the error onto the other path", async () => {
  const { form, counters, container, root } = await renderSlice();
  await type(container, "billing", "100");
  await act(async () => undefined);
  assert.deepEqual(
    form.store.read(issuesCell("billing.postcode")).map((i) => i.message),
    ["must match shipping"]
  );

  const before = { ...counters };
  await type(container, "shipping", "100");
  await act(async () => undefined);

  assert.deepEqual(form.store.read(issuesCell("billing.postcode")), []);
  assert.equal(
    counters.billing,
    before.billing + 1,
    "billing re-rendered because its issues moved"
  );
  assert.equal(counters.shell, before.shell, "the shell did not re-render");
  await act(async () => root.unmount());
});

// 4b - remounting paints the right error immediately
test("a field remounted later paints its error on its first render", async () => {
  const { form, counters, container, root } = await renderSlice();

  // Unmount the field that will carry the error, then create the error while
  // it is off screen.
  await act(async () => find(container, "toggle-billing").click());
  assert.equal(find(container, "billing"), null, "billing is unmounted");
  await type(container, "shipping", "999");
  await act(async () => undefined);
  assert.equal(form.store.read(issuesCell("billing.postcode")).length, 1);

  const before = counters.billing;
  await act(async () => find(container, "toggle-billing").click());
  assert.equal(
    counters.billing,
    before + 1,
    "billing painted once, with the error already in hand"
  );
  assert.equal(
    find(container, "billing-error").textContent,
    "must match shipping"
  );
  await act(async () => root.unmount());
});

// The defect this closes: the fan-out writes only cells someone is reading, so
// a cell closed while the root moved under it kept a value the form no longer
// held. It painted on remount and the next keystroke wrote it back.
test("a field remounted after a write it did not see paints the current value", async () => {
  const { form, container, root } = await renderSlice();
  await type(container, "billing", "aaa");
  await act(async () => find(container, "toggle-billing").click());

  await act(async () => form.field("billing").setValue({ postcode: "zzz" }));
  assert.equal(readValueAt(form.readRoot(), "billing.postcode"), "zzz");

  await act(async () => find(container, "toggle-billing").click());
  assert.equal(find(container, "billing").value, "zzz", "painted the root");

  await type(container, "billing", "zzz1");
  assert.equal(
    readValueAt(form.readRoot(), "billing.postcode"),
    "zzz1",
    "the keystroke built on the real value"
  );
  await act(async () => root.unmount());
});

// The defect this closes: `[*]` has no case in the concrete grammar, so it
// parsed as a member named "*" and a write replaced the whole array.
test("addressing a field by a declared path is refused, not guessed", () => {
  const form = buildForm();
  assert.throws(
    () => form.field("items[*].quantity"),
    (error) =>
      error instanceof TypeError && /is a rule, not a place/.test(error.message)
  );
});

// 5 - R3
test("the shipped store and a zustand store both satisfy the contract", () => {
  const failures = [];
  const expect = (holds, what) => {
    if (!holds) failures.push(what);
  };
  assertFormStoreContract(() => createCellStore(), expect);
  assertFormStoreContract(
    () => createZustandCellStore(createStore(() => ({}))),
    expect
  );
  assert.deepEqual(failures, []);
});

test("the slice behaves identically with the zustand store injected", async () => {
  const store = createZustandCellStore(createStore(() => ({})));
  const { form, counters, container, root } = await renderSlice(store);
  const before = { ...counters };
  await type(container, "billing", "100");
  assert.equal(counters.billing, before.billing + 2, "value, then issues");
  assert.equal(counters.shipping, before.shipping);
  await act(async () => undefined);
  assert.deepEqual(
    form.store.read(issuesCell("billing.postcode")).map((i) => i.message),
    ["must match shipping"]
  );
  await act(async () => root.unmount());
});

// The defect this closes: the adapter staged writes but answered reads from
// zustand, so a second read-modify-write of the root inside one batch started
// from the pre-batch value and dropped the first.
test("batched writes to the same cell build on each other in every store", () => {
  for (const build of [
    () => createCellStore(),
    () => createZustandCellStore(createStore(() => ({}))),
  ]) {
    const form = createForm({
      adapter: zodFormResolver(SCHEMA),
      defaultValues: structuredClone(DEFAULTS),
      store: build(),
    });
    form.store.batch(() => {
      form.field("billing.postcode").setValue("111");
      form.field("shipping.postcode").setValue("222");
    });
    assert.deepEqual(form.store.read(ROOT_CELL), {
      billing: { postcode: "111" },
      shipping: { postcode: "222" },
    });
  }
});

// 6 - the diff
test("a pass writes only the issue cells whose content changed", async () => {
  const store = createCellStore();
  const written = [];
  const spied = {
    ...store,
    write: (key, next) => {
      written.push(key);
      store.write(key, next);
    },
  };
  const form = createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
    store: spied,
  });

  form.validate();
  written.length = 0;
  form.validate();
  assert.deepEqual(
    written.filter((key) => key.startsWith("issues:")),
    [],
    "a pass that changes nothing writes no issue cell"
  );

  form.field("billing.postcode").setValue("100");
  written.length = 0;
  form.validate();
  assert.deepEqual(
    written.filter((key) => key.startsWith("issues:")),
    ["issues:billing.postcode"],
    "a pass that changes one field writes one issue cell"
  );
});

// 7 - CSP
test("nothing in the runtime compiles a string", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const sourceFiles = async (directory) => {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) found.push(...(await sourceFiles(full)));
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        found.push(full);
      }
    }
    return found;
  };

  const banned = [/new\s+Function\s*\(/, /(^|[^.\w])eval\s*\(/];
  const offenders = [];
  for (const packageName of [
    "packages/spec/src",
    "packages/form-core/src",
    "packages/form-react/src",
    "packages/form-store-zustand/src",
    "packages/resolver-zod/src",
  ]) {
    for (const file of await sourceFiles(packageName)) {
      const text = await readFile(file, "utf8");
      if (banned.some((pattern) => pattern.test(text))) offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
