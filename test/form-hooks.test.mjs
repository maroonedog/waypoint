// Hooks that know which paths exist.
//
// The types do the work in TypeScript; this file is the half that has to hold
// in JavaScript, where there are no types to help.
//
// A path the form does not declare is WARNED ABOUT, not thrown. Such a field
// is inert — it draws nothing and validates nothing — but it cannot let bad
// data through, because the pass judges the whole ROOT: the verdict and the
// submit gate stay correct, and what actually broke is one field's display.
// Throwing would take the whole form down for that.
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
const { createForm } = await import("form-core");
const { FormProvider, createFormHooks, forgetWarnings } = await import(
  "form-react"
);

const { act, createElement: h } = React;

const ORDER = z.object({
  billing: z.object({ postcode: z.string().min(3), city: z.string() }),
  shipping: z.object({ postcode: z.string().min(3), city: z.string() }),
  items: z.array(z.object({ sku: z.string() })),
});
const OTHER = z.object({ unrelated: z.object({ token: z.string() }) });

const OrderForm = createFormHooks(zodFormResolver(ORDER));

const DEFAULTS = {
  billing: { postcode: "100-0001", city: "Chiyoda" },
  shipping: { postcode: "150-0001", city: "Shibuya" },
  items: [{ sku: "a" }, { sku: "b" }],
};

const orderForm = () =>
  createForm({
    adapter: zodFormResolver(ORDER),
    defaultValues: structuredClone(DEFAULTS),
  });

const otherForm = () =>
  createForm({
    adapter: zodFormResolver(OTHER),
    defaultValues: { unrelated: { token: "x" } },
  });

/** Renders, and collects what was warned and whatever escaped. */
async function mountCatching(element) {
  forgetWarnings();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const warnings = [];
  let escaped = null;
  const quietWarn = console.warn;
  const quietError = console.error;
  console.warn = (...parts) => warnings.push(parts.join(" "));
  console.error = () => {};
  try {
    await act(async () => root.render(element));
  } catch (error) {
    escaped = error;
  } finally {
    console.warn = quietWarn;
    console.error = quietError;
  }
  return { container, root, escaped, warnings, warned: warnings.join("\n") };
}

const text = (container, id) => container.querySelector("#" + id).textContent;

test("a declared path works exactly as the untyped hook does", async () => {
  function Screen() {
    const postcode = OrderForm.useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "");
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("a misspelt path warns and leaves the rest of the form standing", async () => {
  function Screen() {
    const typo = OrderForm.useField("billing.postcod");
    const fine = OrderForm.useField("shipping.postcode");
    return h(
      "div",
      null,
      h("span", { id: "typo" }, String(typo.value)),
      h("span", { id: "fine" }, String(fine.value))
    );
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );

  assert.equal(escaped, null, "a typo must not take the form down");
  assert.match(warned, /billing\.postcod/);
  assert.match(warned, /draw nothing and validate nothing/);
  // The inert field, and its neighbour that is entirely unaffected.
  assert.equal(text(container, "typo"), "undefined");
  assert.equal(text(container, "fine"), "150-0001");
  root.unmount();
});

test("the warning names the paths it might have meant", async () => {
  function Screen() {
    OrderForm.useFieldValue("billing.postcod");
    return null;
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.match(warned, /Did you mean/);
  assert.match(warned, /billing\.postcode/);
  root.unmount();
});

test("the same path is warned about once, not once per render", async () => {
  function Screen() {
    OrderForm.useFieldValue("billing.nope");
    return null;
  }
  const form = orderForm();
  const { root, warnings } = await mountCatching(
    h(FormProvider, { form }, h(Screen))
  );
  await act(async () => form.field("billing.postcode").setValue("x"));
  assert.equal(warnings.length, 1);
  root.unmount();
});

test("hooks rendered under a DIFFERENT form's provider warn", async () => {
  // The one mistake the types cannot see: these hooks carry the order form's
  // paths, and nothing stops them being rendered somewhere else.
  function Screen() {
    OrderForm.useFieldValue("billing.postcode");
    return null;
  }
  const { root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: otherForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.match(warned, /not a field this form declares/);
  root.unmount();
});

test("two forms on one screen stay independent", async () => {
  function Show({ id }) {
    const postcode = OrderForm.useFieldValue("billing.postcode");
    return h("span", { id }, String(postcode));
  }
  const a = orderForm();
  const b = orderForm();
  await act(async () => b.field("billing.postcode").setValue("999-9999"));

  const { container, root, escaped } = await mountCatching(
    h(
      React.Fragment,
      null,
      h(FormProvider, { form: a }, h(Show, { id: "a" })),
      h(FormProvider, { form: b }, h(Show, { id: "b" }))
    )
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "a"), "100-0001");
  assert.equal(text(container, "b"), "999-9999");
  root.unmount();
});

test("a component needs nothing wrapped around it", async () => {
  // There is no scope to be inside or outside of. A path is a path.
  function Screen() {
    const postcode = OrderForm.useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("a rule where a place is needed throws, and names the column reading", async () => {
  // Not a mis-addressing: the path is declared and correct, and binding index
  // zero instead would silently address a row nobody asked for.
  function Screen() {
    OrderForm.useField("items[*].sku");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.ok(escaped !== null, "expected the rule-as-place to throw");
  assert.match(escaped.message, /is a rule, not a place/);
  assert.match(escaped.message, /useFieldValues/);
});

test("a concrete index is addressable, and reads that row", async () => {
  // items[0].sku is a PLACE in the value, not a rule. The declared union has
  // never contained a bare index; what changed is that the hooks now accept
  // one, and check it as the rule it belongs to.
  function Screen() {
    const sku = OrderForm.useField("items[0].sku");
    return h("span", { id: "v" }, String(sku.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "", "a real row is not a mistake");
  assert.equal(text(container, "v"), "a");
  root.unmount();
});

test("a computed row index is addressable too", async () => {
  function Screen() {
    const which = 1;
    const sku = OrderForm.useField(`items[${which}].sku`);
    return h("span", { id: "v" }, String(sku.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "");
  assert.equal(text(container, "v"), "b");
  root.unmount();
});
