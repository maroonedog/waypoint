// A wildcard read as what it usually means: the whole column.
//
// `items[*].sku` outside a row scope is not a place, it is every place. That
// cannot be `useField` — the same expression would be a `string` inside a row
// and a `string[]` outside one, a type that depends on where the component was
// rendered — so it is its own hook, and the ambiguity never exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, FieldRows, useFieldValues } = await import("@maroonedog/waypoint/react");

const { act, createElement: h } = React;

const SCHEMA = z.object({
  items: z.array(z.object({ sku: z.string() })),
  grid: z.array(z.object({ cells: z.array(z.object({ n: z.number() })) })),
});

const DEFAULTS = {
  items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }],
  grid: [
    { cells: [{ n: 1 }, { n: 2 }] },
    { cells: [{ n: 3 }] },
  ],
};

const newForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });

async function mount(element) {
  const { container, root } = await mountIntoDocument(element);
  return { container, root, at: (id) => container.querySelector("#" + id) };
}

/** Counts its own renders, so "was it woken" is a fact rather than a guess. */
const makeColumn = (path, id, renders) =>
  function Column() {
    const values = useFieldValues(path);
    if (renders) renders.count += 1;
    return h("span", { id }, JSON.stringify(values));
  };

test("an unbound wildcard reads the whole column", async () => {
  const { at, root } = await mount(
    h(FormProvider, { form: newForm() }, h(makeColumn("form:items[*].sku", "v")))
  );
  assert.equal(at("v").textContent, '["a","b","c"]');
  root.unmount();
});

test("editing one row moves the column", async () => {
  const form = newForm();
  const { at, root } = await mount(
    h(FormProvider, { form }, h(makeColumn("form:items[*].sku", "v")))
  );

  await act(async () => form.field("items[1].sku").setValue("B!"));

  assert.equal(at("v").textContent, '["a","B!","c"]');
  root.unmount();
});

test("a splice changes the column, and the new row is subscribed too", async () => {
  const form = newForm();
  let insert;
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldRows, { path: "form:items" }, (rows) => {
        insert = () => rows.insert(rows.rows.length, { sku: "new" });
        return h(makeColumn("form:items[*].sku", "v"));
      })
    )
  );
  assert.equal(at("v").textContent, '["a","b","c"]');

  await act(async () => insert());
  assert.equal(at("v").textContent, '["a","b","c","new"]');

  // The row that did not exist when the component first subscribed.
  await act(async () => form.field("items[3].sku").setValue("edited"));
  assert.equal(at("v").textContent, '["a","b","c","edited"]');
  root.unmount();
});

test("a removal shortens it", async () => {
  const form = newForm();
  let remove;
  const { at, root } = await mount(
    h(
      FormProvider,
      { form },
      h(FieldRows, { path: "form:items" }, (rows) => {
        remove = () => rows.remove(0);
        return h(makeColumn("form:items[*].sku", "v"));
      })
    )
  );

  await act(async () => remove());

  assert.equal(at("v").textContent, '["b","c"]');
  root.unmount();
});

test("one row's column is addressed by naming that row", async () => {
  // Binding the outer index is now spelled where it is meant, in the path,
  // rather than inherited from a wrapper that also rewrote everything else.
  const form = newForm();
  const { at, root } = await mount(
    h(FormProvider, { form }, h(makeColumn("grid[1].cells[*].n", "v")))
  );
  assert.equal(at("v").textContent, "[3]");
  root.unmount();
});

test("with no scope at all, a nested wildcard reads every place it covers", async () => {
  const { at, root } = await mount(
    h(
      FormProvider,
      { form: newForm() },
      h(makeColumn("grid[*].cells[*].n", "v"))
    )
  );
  assert.equal(at("v").textContent, "[1,2,3]");
  root.unmount();
});

test("a column is not woken by a write outside it", async () => {
  const form = newForm();
  const renders = { count: 0 };
  const { root } = await mount(
    h(
      FormProvider,
      { form },
      h(makeColumn("form:items[*].sku", "v", renders))
    )
  );
  const before = renders.count;

  await act(async () => form.field("grid[0].cells[0].n").setValue(99));

  assert.equal(renders.count, before, "an unrelated write must not wake it");
  root.unmount();
});

test("the snapshot is reference-stable when nothing changed", async () => {
  // A fresh array from getSnapshot on every read is what makes React loop.
  const form = newForm();
  const renders = { count: 0 };
  const { root } = await mount(
    h(FormProvider, { form }, h(makeColumn("form:items[*].sku", "v", renders)))
  );
  const before = renders.count;

  // A write that lands the same value writes nothing and must wake nothing.
  await act(async () => form.field("items[0].sku").setValue("a"));

  assert.equal(renders.count, before);
  root.unmount();
});
