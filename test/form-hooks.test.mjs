// Hooks that know which paths exist.
//
// The types do the work in TypeScript; this file is the half that has to hold
// in JavaScript, where there are no types to help. A path the form does not
// declare must THROW rather than render an empty input that is never validated
// and says nothing — which is what `useField` on its own does, and what this
// repository criticises other libraries for.
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
const { FormProvider, FieldScope, createFormHooks, UndeclaredPathError } =
  await import("form-react");

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

/** Renders and returns whatever escaped, so a throw during render is catchable. */
async function mountCatching(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  let escaped = null;
  // React logs the error it re-throws; the test asserts on the throw itself.
  const quiet = console.error;
  console.error = () => {};
  try {
    await act(async () => root.render(element));
  } catch (error) {
    escaped = error;
  } finally {
    console.error = quiet;
  }
  return { container, root, escaped };
}

test("a declared path works exactly as the untyped hook does", async () => {
  function Screen() {
    const postcode = OrderForm.useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(container.querySelector("#v").textContent, "100-0001");
  root.unmount();
});

test("a path the form does not declare throws, rather than rendering nothing", async () => {
  function Screen() {
    const typo = OrderForm.useField("billing.postcod");
    return h("span", null, String(typo.value));
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.ok(escaped instanceof UndeclaredPathError, "expected UndeclaredPathError");
  assert.match(escaped.message, /billing\.postcod/);
});

test("the error names the paths it might have meant", async () => {
  function Screen() {
    OrderForm.useFieldValue("billing.postcod");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.match(escaped.message, /Did you mean/);
  assert.match(escaped.message, /billing\.postcode/);
});

test("a local name is checked against the scope it is rendered in", async () => {
  function Inner() {
    const postcode = OrderForm.useField("postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped } = await mountCatching(
    h(
      FormProvider,
      { form: orderForm() },
      h(FieldScope, { prefix: "shipping" }, h(Inner))
    )
  );
  assert.equal(escaped, null);
  assert.equal(container.querySelector("#v").textContent, "150-0001");
  root.unmount();
});

test("the same local name outside its scope throws", async () => {
  function Inner() {
    OrderForm.useField("postcode");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Inner))
  );
  assert.ok(escaped instanceof UndeclaredPathError);
  assert.match(escaped.message, /"postcode"/);
});

test("hooks rendered under a DIFFERENT form's provider throw", async () => {
  // The one mistake the types cannot see: these hooks carry the order form's
  // paths, and nothing stops them being rendered somewhere else.
  function Screen() {
    OrderForm.useFieldValue("billing.postcode");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: otherForm() }, h(Screen))
  );
  assert.ok(escaped instanceof UndeclaredPathError, "expected UndeclaredPathError");
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
  assert.equal(container.querySelector("#a").textContent, "100-0001");
  assert.equal(container.querySelector("#b").textContent, "999-9999");
  root.unmount();
});

test("no FieldScope is needed for an absolute path", async () => {
  // The scope defaults to the root, so a component that knows the whole path
  // needs nothing wrapped around it at all.
  function Screen() {
    const postcode = OrderForm.useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(container.querySelector("#v").textContent, "100-0001");
  root.unmount();
});

test("a wildcard path outside a row scope says which scope is missing", async () => {
  function Screen() {
    OrderForm.useField("items[*].sku");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.match(escaped.message, /needs a row index/);
  assert.match(escaped.message, /FieldScope row=/);
});

test("a concrete index is explained as a row, not as a typo", async () => {
  // Descriptors are keyed by the rule, so items[0].sku is a real place in the
  // value that is simply not a declared path. Saying only "not declared" would
  // send somebody hunting a spelling mistake that is not there.
  function Screen() {
    OrderForm.useField("items[0].sku");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.ok(escaped instanceof UndeclaredPathError);
  assert.ok(
    escaped.message.includes('names one row of "items[*].sku"'),
    escaped.message
  );
  assert.match(escaped.message, /FieldScope row=/);
  assert.doesNotMatch(escaped.message, /Did you mean/);
});
