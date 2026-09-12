// Layers 1 and 2: the tree drawn through a widget registry, and the name a
// caller writes to overrule it.
//
// WHY FOUR TESTS AND NOT FOUR FILES. What the registry answers is not "which
// widget for this field" but an ORDER — exact path, then named format, then
// closed field, then family — and an order is only observable in the
// comparison. A test that pinned one entry on its own would pass under a
// registry that consulted that entry and nothing else, which is the failure
// this arrangement exists to catch. Layer 2 belongs with them for the same
// reason: `as` is not a separate mechanism, it is one more rung, and the only
// claim worth making about it is where it sits relative to the other four.
//
// WHAT THIS FILE IS NO LONGER ABOUT. It used to carry the form's status count
// and the dormant-subtree tests as well, which drew no widget and mounted no
// AutoForm. Those ask what is IN the number that blocks a submit, which is a
// question about the runtime rather than about drawing, and they are in
// form-status.test.mjs. They still read the same schema, from
// support/owner-form.mjs, which says why.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument as mount } from "./support/react-root.mjs";
import { newForm, GOOD } from "./support/owner-form.mjs";
import { find } from "./support/testid-lookup.mjs";

const React = await import("react");
const { FormProvider, AutoForm, Field } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h } = React;

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
      h(Field, { path: "form:owner.name", as: "badge" })
    )
  );
  assert.equal(
    find(container, "w-owner.name").getAttribute("data-widget"),
    "named",
    "the name the caller wrote beats the path entry"
  );
  await act(async () => root.unmount());
});
