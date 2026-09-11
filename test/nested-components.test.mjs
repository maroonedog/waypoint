// A form that does not fit in one file, which is nearly all of them.
//
// The two questions any form library has to answer once the screen is split
// across components: how does a value get DOWN to a nested component, and how
// does a value get back OUT of one. The answer here is that neither happens.
// A nested component names the field it wants and subscribes to it; the value
// never travels through props, and nothing above it holds state to lift.
//
// What that buys is the reusable subtree: <AddressFields /> takes no props at
// all and is correct under billing and under shipping, because the prefix is
// supplied by where it is rendered rather than by what it is passed.
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
const {
  FormProvider,
  FieldRows,
  FieldScope,
  useField,
  useFieldValue,
  useUncontrolledField,
} = await import("form-react");

const { act, createElement: h, Fragment } = React;

const ADDRESS = z.object({
  postcode: z.string().min(3, "too short"),
  city: z.string(),
});

const SCHEMA = z.object({
  billing: ADDRESS,
  shipping: ADDRESS,
  company: z.object({ office: ADDRESS }),
  items: z.array(z.object({ sku: z.string().min(1) })),
});

const DEFAULTS = {
  billing: { postcode: "100-0001", city: "Chiyoda" },
  shipping: { postcode: "150-0001", city: "Shibuya" },
  company: { office: { postcode: "060-0001", city: "Sapporo" } },
  items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }],
};

/**
 * THE POINT OF THE FILE: no props. It knows the names of the fields it draws
 * and nothing about where in the form it has been placed.
 */
function AddressFields() {
  const postcode = useField("postcode");
  const city = useField("city");
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

/** Also no props, and also uncontrolled — the scope has to reach both hooks. */
function UncontrolledAddress() {
  const postcode = useUncontrolledField("postcode");
  return h("input", {
    "data-testid": `u-${postcode.path}`,
    defaultValue: postcode.defaultValue,
    ref: postcode.ref,
    onChange: postcode.onChange,
  });
}

/**
 * A reader somewhere else entirely: not a parent of the field, not a child of
 * it, holding no state and given no props.
 */
function ElsewhereOnTheScreen() {
  const billing = useFieldValue("billing.postcode");
  return h("span", { "data-testid": "readout" }, String(billing ?? ""));
}

async function mount(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  const at = (testId) =>
    container.querySelector(`[data-testid=${JSON.stringify(testId)}]`);
  const msg = (path) =>
    container.querySelector(`[data-msg=${JSON.stringify(path)}]`)?.textContent ??
    "";
  return { container, root, at, msg };
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

test("one propless component is correct under two different prefixes", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldScope, { prefix: "billing" }, h(AddressFields)),
      h(FieldScope, { prefix: "shipping" }, h(AddressFields))
    )
  );

  // The value arrived without being passed.
  assert.equal(at("pc-billing.postcode").value, "100-0001");
  assert.equal(at("pc-shipping.postcode").value, "150-0001");
  assert.equal(at("city-billing.city").value, "Chiyoda");

  root.unmount();
});

test("typing in one copy does not reach the other", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldScope, { prefix: "billing" }, h(AddressFields)),
      h(FieldScope, { prefix: "shipping" }, h(AddressFields))
    )
  );

  await act(async () => typeInto(at("pc-billing.postcode"), "999-9999"));

  assert.equal(at("pc-billing.postcode").value, "999-9999");
  assert.equal(at("pc-shipping.postcode").value, "150-0001");
  root.unmount();
});

test("a value is read from elsewhere with no props and nothing lifted", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldScope, { prefix: "billing" }, h(AddressFields)),
      // A sibling of the scope, not an ancestor of the field.
      h(ElsewhereOnTheScreen)
    )
  );

  assert.equal(at("readout").textContent, "100-0001");

  await act(async () => typeInto(at("pc-billing.postcode"), "777-7777"));

  assert.equal(at("readout").textContent, "777-7777");
  root.unmount();
});

test("prefixes compose, so a subtree can be placed inside another one", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(
        FieldScope,
        { prefix: "company" },
        h(FieldScope, { prefix: "office" }, h(AddressFields))
      )
    )
  );

  assert.equal(at("pc-company.office.postcode").value, "060-0001");
  root.unmount();
});

test("an issue lands on the right copy, not on both", async () => {
  const form = newForm();
  const { at, msg, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldScope, { prefix: "billing" }, h(AddressFields)),
      h(FieldScope, { prefix: "shipping" }, h(AddressFields))
    )
  );

  await act(async () => typeInto(at("pc-billing.postcode"), "1"));

  assert.equal(msg("billing.postcode"), "too short");
  assert.equal(msg("shipping.postcode"), "");
  root.unmount();
});

test("the uncontrolled binding resolves through a prefix too", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldScope, { prefix: "billing" }, h(UncontrolledAddress)),
      h(FieldScope, { prefix: "shipping" }, h(UncontrolledAddress))
    )
  );

  assert.equal(at("u-billing.postcode").value, "100-0001");
  assert.equal(at("u-shipping.postcode").value, "150-0001");

  // And a programmatic write still finds the right node of the two.
  await act(async () => form.field("shipping.postcode").setValue("500-0005"));

  assert.equal(at("u-shipping.postcode").value, "500-0005");
  assert.equal(at("u-billing.postcode").value, "100-0001");
  root.unmount();
});

/**
 * Propless, and inside a row. Its ADDRESS changes when the list is spliced
 * while the component itself survives — the row keeps its opaque key, so React
 * does not remount it. That asymmetry is where this repository has had a real
 * bug before: value cells re-derive themselves on subscribe, row order does
 * not, and an uncontrolled node is written by an effect rather than by React.
 */
function RowSku() {
  const sku = useUncontrolledField("items[*].sku");
  return h("input", {
    "data-testid": `sku-${sku.path}`,
    defaultValue: sku.defaultValue,
    ref: sku.ref,
    onChange: sku.onChange,
  });
}

test("an uncontrolled field inside a row follows the splice", async () => {
  const form = newForm();
  let removeFirst;
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldRows, { path: "items" }, ({ rows, remove }) => {
        removeFirst = () => remove(0);
        return h(
          Fragment,
          null,
          rows.map((row) => h(FieldScope, { key: row.key, row }, h(RowSku)))
        );
      })
    )
  );

  assert.equal(at("sku-items[0].sku").value, "a");
  assert.equal(at("sku-items[1].sku").value, "b");
  assert.equal(at("sku-items[2].sku").value, "c");

  await act(async () => removeFirst());

  // Two rows left, and each node shows the value that moved into its slot.
  assert.equal(at("sku-items[0].sku").value, "b");
  assert.equal(at("sku-items[1].sku").value, "c");
  assert.equal(at("sku-items[2].sku"), null);
  root.unmount();
});

test("a row edited before the splice keeps the edit afterwards", async () => {
  const form = newForm();
  let removeFirst;
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldRows, { path: "items" }, ({ rows, remove }) => {
        removeFirst = () => remove(0);
        return h(
          Fragment,
          null,
          rows.map((row) => h(FieldScope, { key: row.key, row }, h(RowSku)))
        );
      })
    )
  );

  await act(async () => typeInto(at("sku-items[2].sku"), "edited"));
  await act(async () => removeFirst());

  assert.equal(at("sku-items[1].sku").value, "edited");
  root.unmount();
});
