// A form that does not fit in one file, which is nearly all of them.
//
// The two questions any form library has to answer once the screen is split:
// how does a value get DOWN to a nested component, and how does one get back
// OUT. The answer here is that neither travels. A component is handed an
// ADDRESS — a short, stable string — and subscribes to what it wants. Nothing
// above it holds state to lift, and a value moving never re-renders a parent.
//
// An address is a prop, and that is deliberate. There was a <FieldScope> that
// put it in context instead, and it was removed: it rewrote EVERY path below
// it with no way out, so a component inside `prefix="billing"` asking for
// `shipping.postcode` silently resolved to `billing.shipping.postcode` and
// rendered nothing at all. A prop cannot do that to a component that did not
// ask for it.
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
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, FieldRows, useField, useFieldValue, useUncontrolledField } =
  await import("@maroonedog/waypoint/react");

const { act, createElement: h, Fragment } = React;

const ADDRESS = z.object({
  postcode: z.string().min(3, "too short"),
  city: z.string(),
});

const SCHEMA = z.object({
  billing: ADDRESS,
  shipping: ADDRESS,
  company: z.object({ office: ADDRESS }),
  items: z.array(z.object({ sku: z.string() })),
});

const DEFAULTS = {
  billing: { postcode: "100-0001", city: "Chiyoda" },
  shipping: { postcode: "150-0001", city: "Shibuya" },
  company: { office: { postcode: "060-0001", city: "Sapporo" } },
  items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }],
};

/**
 * THE POINT OF THE FILE. One prop, and it is a location: never a value, never
 * a setter, never a change handler. It does not move when the value does, so
 * passing it costs nothing and re-renders nobody.
 */
function AddressFields({ at }) {
  const postcode = useField(`${at}.postcode`);
  const city = useField(`${at}.city`);
  return h(
    Fragment,
    null,
    h("input", {
      "data-testid": `pc-${postcode.path}`,
      value: postcode.value ?? "",
      onChange: (event) => postcode.setValue(event.target.value),
    }),
    h("em", { "data-msg": postcode.path }, postcode.issues[0]?.message ?? ""),
    h("input", {
      "data-testid": `city-${city.path}`,
      value: city.value ?? "",
      onChange: (event) => city.setValue(event.target.value),
    })
  );
}

function UncontrolledAddress({ at }) {
  const postcode = useUncontrolledField(`${at}.postcode`);
  return h("input", {
    "data-testid": `u-${postcode.path}`,
    defaultValue: postcode.defaultValue,
    ref: postcode.ref,
    onChange: postcode.onChange,
  });
}

/** Somewhere else entirely: not a parent of the field, not a child of it. */
function ElsewhereOnTheScreen() {
  const billing = useFieldValue("billing.postcode");
  return h("span", { "data-testid": "readout" }, String(billing ?? ""));
}

async function mount(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  const shown = (testId) =>
    container.querySelector(`[data-testid=${JSON.stringify(testId)}]`);
  const msg = (path) =>
    container.querySelector(`[data-msg=${JSON.stringify(path)}]`)?.textContent ??
    "";
  return { container, root, shown, msg };
}

const newForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });

const typeInto = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value"
  ).set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
};

test("one component is correct at two different addresses", async () => {
  const form = newForm();
  const { shown, root } = await mount(
    h(
      FormProvider,
      { form },
      h(AddressFields, { at: "billing" }),
      h(AddressFields, { at: "shipping" })
    )
  );

  // The value arrived without being passed.
  assert.equal(shown("pc-billing.postcode").value, "100-0001");
  assert.equal(shown("pc-shipping.postcode").value, "150-0001");
  assert.equal(shown("city-billing.city").value, "Chiyoda");
  root.unmount();
});

test("typing in one copy does not reach the other", async () => {
  const form = newForm();
  const { shown, root } = await mount(
    h(
      FormProvider,
      { form },
      h(AddressFields, { at: "billing" }),
      h(AddressFields, { at: "shipping" })
    )
  );

  await act(async () => typeInto(shown("pc-billing.postcode"), "999-9999"));

  assert.equal(shown("pc-billing.postcode").value, "999-9999");
  assert.equal(shown("pc-shipping.postcode").value, "150-0001");
  root.unmount();
});

test("a value is read from elsewhere with no props and nothing lifted", async () => {
  const form = newForm();
  const { shown, root } = await mount(
    h(
      FormProvider,
      { form },
      h(AddressFields, { at: "billing" }),
      h(ElsewhereOnTheScreen)
    )
  );

  assert.equal(shown("readout").textContent, "100-0001");
  await act(async () => typeInto(shown("pc-billing.postcode"), "777-7777"));
  assert.equal(shown("readout").textContent, "777-7777");
  root.unmount();
});

test("an address composes, so a subtree can be placed inside another one", async () => {
  const form = newForm();
  const { shown, root } = await mount(
    h(FormProvider, { form }, h(AddressFields, { at: "company.office" }))
  );
  assert.equal(shown("pc-company.office.postcode").value, "060-0001");
  root.unmount();
});

test("an issue lands on the right copy, not on both", async () => {
  const form = newForm();
  const { shown, msg, root } = await mount(
    h(
      FormProvider,
      { form },
      h(AddressFields, { at: "billing" }),
      h(AddressFields, { at: "shipping" })
    )
  );

  await act(async () => typeInto(shown("pc-billing.postcode"), "1"));

  assert.equal(msg("billing.postcode"), "too short");
  assert.equal(msg("shipping.postcode"), "");
  root.unmount();
});

test("a nested component can read ANYWHERE, not only under its own address", async () => {
  // The thing the removed scope made impossible. This component sits at
  // `billing` and reads `shipping`, which is an ordinary thing for a form to
  // want and used to resolve silently to billing.shipping.postcode.
  function CrossReader({ at }) {
    const here = useFieldValue(`${at}.postcode`);
    const elsewhere = useFieldValue("shipping.postcode");
    return h("span", { "data-testid": "cross" }, `${here}|${elsewhere}`);
  }
  const form = newForm();
  const { shown, root } = await mount(
    h(FormProvider, { form }, h(CrossReader, { at: "billing" }))
  );
  assert.equal(shown("cross").textContent, "100-0001|150-0001");
  root.unmount();
});

test("the uncontrolled binding takes an address too", async () => {
  const form = newForm();
  const { shown, root } = await mount(
    h(
      FormProvider,
      { form },
      h(UncontrolledAddress, { at: "billing" }),
      h(UncontrolledAddress, { at: "shipping" })
    )
  );

  assert.equal(shown("u-billing.postcode").value, "100-0001");
  assert.equal(shown("u-shipping.postcode").value, "150-0001");

  await act(async () => form.field("shipping.postcode").setValue("500-0005"));

  assert.equal(shown("u-shipping.postcode").value, "500-0005");
  assert.equal(shown("u-billing.postcode").value, "100-0001");
  root.unmount();
});

/** Propless is gone; the row hands down its own address instead. */
function RowSku({ at }) {
  const sku = useUncontrolledField(`${at}.sku`);
  return h("input", {
    "data-testid": `sku-${sku.path}`,
    defaultValue: sku.defaultValue,
    ref: sku.ref,
    onChange: sku.onChange,
  });
}

const listOf = (form, capture) =>
  h(
    FormProvider,
    { form },
    h(FieldRows, { path: "items" }, (binding) => {
      capture(binding);
      return binding.rows.map((row) =>
        h(RowSku, { key: row.key, at: row.path })
      );
    })
  );

test("a row hands its own address down, with no wrapper", async () => {
  const form = newForm();
  let binding;
  const { shown, root } = await mount(listOf(form, (b) => (binding = b)));

  assert.equal(shown("sku-items[0].sku").value, "a");
  assert.equal(shown("sku-items[1].sku").value, "b");
  assert.equal(shown("sku-items[2].sku").value, "c");

  await act(async () => binding.remove(0));

  assert.equal(shown("sku-items[0].sku").value, "b");
  assert.equal(shown("sku-items[1].sku").value, "c");
  assert.equal(shown("sku-items[2].sku"), null);
  root.unmount();
});

test("a row edited before the splice keeps the edit afterwards", async () => {
  const form = newForm();
  let binding;
  const { shown, root } = await mount(listOf(form, (b) => (binding = b)));

  await act(async () => typeInto(shown("sku-items[2].sku"), "edited"));
  await act(async () => binding.remove(0));

  assert.equal(shown("sku-items[1].sku").value, "edited");
  root.unmount();
});
