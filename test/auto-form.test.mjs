// Layers 1 and 2 on screen: the tree drawn through a registry, and a scope
// that stops blocking.
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
const { FormProvider, AutoForm, Field, FieldScope, useFormStatus } =
  await import("form-react");

const { act, createElement: h, Fragment } = React;

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
  plan: z.enum(["free", "pro"]),
  items: z.array(z.object({ sku: z.string().min(1) })),
});

const GOOD = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  plan: "free",
  items: [{ sku: "A-1" }],
};

const drawn = (label) => ({ field }) =>
  h("i", { "data-testid": "w-" + field.path, "data-widget": label });

const REGISTRY = {
  byName: { badge: drawn("named") },
  byPath: { "owner.name": drawn("path") },
  byFormat: { email: drawn("format") },
  choices: drawn("choices"),
  byKind: { string: drawn("kind") },
  fallback: drawn("fallback"),
};

const find = (container, testId) =>
  container.querySelector("[data-testid=" + JSON.stringify(testId) + "]");

async function mount(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}

const newForm = (defaultValues = GOOD) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
  });

test("layer 1 draws every declared field, rows included", async () => {
  const form = newForm();
  const { container, root } = await mount(
    h(FormProvider, { form, widgets: REGISTRY }, h(AutoForm, null))
  );
  for (const path of [
    "owner.name",
    "owner.email",
    "plan",
    "items[0].sku",
  ]) {
    assert.ok(find(container, "w-" + path), path + " was drawn");
  }
  await act(async () => root.unmount());
});

test("a widget is chosen most specific first", async () => {
  const form = newForm();
  const { container, root } = await mount(
    h(FormProvider, { form, widgets: REGISTRY }, h(AutoForm, null))
  );
  const widgetOf = (path) =>
    find(container, "w-" + path).getAttribute("data-widget");

  assert.equal(widgetOf("owner.name"), "path", "the exact path wins");
  assert.equal(widgetOf("owner.email"), "format", "then the named format");
  assert.equal(widgetOf("plan"), "choices", "then a closed field");
  assert.equal(widgetOf("items[0].sku"), "kind", "then the family");
  await act(async () => root.unmount());
});

test("a byPath entry serves every row of a list", async () => {
  const form = newForm({ ...GOOD, items: [{ sku: "A" }, { sku: "B" }] });
  const registry = { ...REGISTRY, byPath: { "items[*].sku": drawn("row") } };
  const { container, root } = await mount(
    h(FormProvider, { form, widgets: registry }, h(AutoForm, null))
  );
  assert.equal(
    find(container, "w-items[0].sku").getAttribute("data-widget"),
    "row"
  );
  assert.equal(
    find(container, "w-items[1].sku").getAttribute("data-widget"),
    "row"
  );
  await act(async () => root.unmount());
});

test("layer 2 names a widget with as", async () => {
  const form = newForm();
  const { container, root } = await mount(
    h(
      FormProvider,
      { form, widgets: REGISTRY },
      h(Field, { path: "owner.name", as: "badge" })
    )
  );
  assert.equal(
    find(container, "w-owner.name").getAttribute("data-widget"),
    "named",
    "the name the caller wrote beats the path entry"
  );
  await act(async () => root.unmount());
});

test("the status reflects what blocks and how often it was tried", async () => {
  const form = newForm({ ...GOOD, owner: { name: "A", email: "nope" } });
  const Status = () => {
    const status = useFormStatus();
    return h(
      "span",
      { "data-testid": "status" },
      status.errorCount + "/" + status.submitCount
    );
  };
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Status, null))
  );

  await act(async () => {
    form.validate();
  });
  assert.equal(find(container, "status").textContent, "2/0");

  await act(async () => {
    await form.submit(() => undefined);
  });
  assert.equal(find(container, "status").textContent, "2/1");
  await act(async () => root.unmount());
});

test("a scope switched off stops blocking while it is mounted", async () => {
  const form = newForm({ ...GOOD, owner: { name: "A", email: "nope" } });
  const Status = () => {
    const status = useFormStatus();
    return h("span", { "data-testid": "status" }, String(status.errorCount));
  };
  const Screen = ({ dormant }) =>
    h(
      FormProvider,
      { form },
      h(
        Fragment,
        null,
        h(Status, null),
        h(FieldScope, { prefix: "owner", participating: !dormant }, null)
      )
    );

  const { container, root } = await mount(h(Screen, { dormant: false }));
  await act(async () => {
    form.validate();
  });
  assert.equal(find(container, "status").textContent, "2");

  await act(async () => root.render(h(Screen, { dormant: true })));
  await act(async () => undefined);
  assert.equal(find(container, "status").textContent, "0");

  await act(async () => root.render(h(Screen, { dormant: false })));
  await act(async () => undefined);
  assert.equal(find(container, "status").textContent, "2");
  await act(async () => root.unmount());
});
