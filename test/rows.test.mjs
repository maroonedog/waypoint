// Rows, at the runtime level: what a structural edit does to the cells that
// carry the concrete index.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import {
  createForm,
  valueCell,
  touchedCell,
  issuesCell,
  rowsCell,
  declaredPathOf,
  bindDeclaredPath,
  expandDeclaredPath,
} from "form-core";

const SCHEMA = z.object({
  items: z.array(
    z.object({ sku: z.string().min(1), quantity: z.number().min(1) })
  ),
});

const threeRows = () => ({
  items: [
    { sku: "a", quantity: 1 },
    { sku: "b", quantity: 2 },
    { sku: "c", quantity: 3 },
  ],
});

const build = (defaultValues = threeRows()) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
    store: undefined,
  });

const ids = (form) => form.store.read(rowsCell("items"));
const cell = (form, path) => form.store.read(valueCell(path));

test("a declared path and a concrete one convert both ways", () => {
  assert.equal(declaredPathOf("items[3].quantity"), "items[*].quantity");
  assert.equal(declaredPathOf("owner.name"), "owner.name");
  assert.equal(bindDeclaredPath("items[*].quantity", [3]), "items[3].quantity");
  assert.equal(bindDeclaredPath("a[*].b[*].c", [1, 2]), "a[1].b[2].c");
  assert.equal(bindDeclaredPath("items[*].quantity", []), undefined);
});

test("a declared path expands over the rows the value actually holds", () => {
  const root = { a: [{ b: [{ c: 1 }, { c: 2 }] }, { b: [{ c: 3 }] }] };
  // Outer row first, then the rows inside it. A splice reads these in order.
  assert.deepEqual(expandDeclaredPath(root, "a[*].b[*].c"), [
    "a[0].b[0].c",
    "a[0].b[1].c",
    "a[1].b[0].c",
  ]);
});

test("rows in the defaults have keys before anything is edited", () => {
  const form = build();
  assert.deepEqual(ids(form), ["r0", "r1", "r2"]);
});

test("an empty array is materialised, so a row can be inserted into it", () => {
  const form = build({});
  assert.deepEqual(form.readRoot(), { items: [] });
  assert.deepEqual(ids(form), []);
  form.rows("items").insert(0, { sku: "x", quantity: 5 });
  assert.deepEqual(form.readRoot().items, [{ sku: "x", quantity: 5 }]);
});

test("inserting keeps the ids of the rows that were already there", () => {
  const form = build();
  form.rows("items").insert(1, { sku: "new", quantity: 9 });
  const after = ids(form);
  assert.equal(after.length, 4);
  assert.deepEqual([after[0], after[2], after[3]], ["r0", "r1", "r2"]);
  assert.deepEqual(form.readRoot().items.map((row) => row.sku), [
    "a",
    "new",
    "b",
    "c",
  ]);
});

// The defect this exists to catch: cell keys carry the index, so a row removed
// from the middle leaves every following row reading the cell of its old
// neighbour.
test("removing a row carries the following rows cells down with them", () => {
  const form = build();
  form.field("items[0].quantity").setValue(10);
  form.field("items[1].quantity").setValue(20);
  form.field("items[2].quantity").setValue(30);
  form.field("items[2].sku").markTouched();

  form.rows("items").remove(0);

  assert.deepEqual(form.readRoot().items.map((row) => row.quantity), [20, 30]);
  assert.equal(cell(form, "items[0].quantity"), 20, "row 1 became row 0");
  assert.equal(cell(form, "items[1].quantity"), 30, "row 2 became row 1");
  assert.equal(
    cell(form, "items[2].quantity"),
    undefined,
    "the vacated row keeps no cell"
  );
  assert.equal(
    form.store.read(touchedCell("items[1].sku")),
    true,
    "the touched flag moved with its row"
  );
  assert.equal(form.store.read(touchedCell("items[2].sku")), undefined);
  assert.deepEqual(ids(form), ["r1", "r2"]);
});

test("moving a row takes its cells with it", () => {
  const form = build();
  form.field("items[0].quantity").setValue(10);
  form.field("items[2].quantity").setValue(30);

  form.rows("items").move(0, 2);

  assert.deepEqual(form.readRoot().items.map((row) => row.sku), ["b", "c", "a"]);
  assert.deepEqual(ids(form), ["r1", "r2", "r0"]);
  assert.equal(cell(form, "items[2].quantity"), 10, "the moved row kept 10");
  assert.equal(cell(form, "items[1].quantity"), 30, "row 2 slid to row 1");
});

test("an issue stays on the row it belongs to after a removal", () => {
  const form = build({
    items: [
      { sku: "a", quantity: 1 },
      { sku: "b", quantity: 1 },
      { sku: "", quantity: 1 },
    ],
  });
  form.validate();
  assert.deepEqual(
    form.store.read(issuesCell("items[2].sku")).map((issue) => issue.code),
    ["too_small"]
  );

  form.rows("items").remove(0);
  form.validate();

  assert.deepEqual(
    form.store.read(issuesCell("items[1].sku")).map((issue) => issue.code),
    ["too_small"],
    "the empty sku is now row 1"
  );
  assert.deepEqual(form.store.read(issuesCell("items[2].sku")), undefined);
});

test("a field addressed by a declared path is still refused", () => {
  const form = build();
  assert.throws(() => form.field("items[*].quantity"), TypeError);
});

test("validating one row member judges the real root, not a rebuilt one", () => {
  const form = build({
    items: [
      { sku: "a", quantity: 1 },
      { sku: "", quantity: 1 },
    ],
  });
  const issues = form.field("items[1].sku").validate();
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["items[1].sku"],
    "the real index, not zero"
  );
});
