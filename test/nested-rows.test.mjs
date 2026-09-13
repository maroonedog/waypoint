// What a row keeps when the list under it is edited: its nested row order, its
// member values, its issues, its participation flag, and the containers above
// it. There is no React in this file and no document: every assertion reads a
// cell, the root, or a subscriber that woke.
//
// One file and not five because a splice rewrites the concrete indices under
// all of them at once, so each is a separate chance for it to move one thing
// and leave another behind. Five of the thirteen tests carry a comment
// naming what went wrong there; the rest are the bounds that keep those five
// from passing for the wrong reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import {
  createForm,
  valueCell,
  issuesCell,
  touchedCell,
  participatingCell,
  rowsCell,
  errorCountCell,
} from "@maroonedog/waypoint/core";

const SCHEMA = z.object({
  items: z.array(
    z.object({
      sku: z.string().min(1, "a product code is required"),
      tags: z.array(z.object({ label: z.string().min(1) })),
    })
  ),
});

const THREE = {
  items: [
    { sku: "a", tags: [{ label: "a0" }, { label: "a1" }, { label: "a2" }] },
    { sku: "b", tags: [{ label: "b0" }] },
    { sku: "c", tags: [{ label: "c0" }, { label: "c1" }] },
  ],
};

const build = (defaultValues = THREE) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
  });

const cell = (form, key) => form.store.read(key);

// A value cell is re-derived when it is subscribed, so a missing one repairs
// itself. Nothing re-derives a row ORDER, so a list whose order was never
// written renders no rows at all.
test("a nested list has its row order before anything mounts", () => {
  const form = build();
  assert.deepEqual(cell(form, rowsCell("items")).length, 3);
  assert.equal(cell(form, rowsCell("items[0].tags")).length, 3);
  assert.equal(cell(form, rowsCell("items[1].tags")).length, 1);
  assert.equal(cell(form, rowsCell("items[2].tags")).length, 2);
  assert.deepEqual(
    form.rows("items[0].tags").ids.read().length,
    3,
    "the handle agrees with the value"
  );
});

test("a form answers the same before and after a reset", () => {
  const form = build();
  const idsBefore = [
    cell(form, rowsCell("items")).length,
    cell(form, rowsCell("items[0].tags")).length,
  ];
  form.reset();
  assert.deepEqual(
    [
      cell(form, rowsCell("items")).length,
      cell(form, rowsCell("items[0].tags")).length,
    ],
    idsBefore
  );
});

test("a row member holds its value before anything mounts", () => {
  const form = build();
  assert.equal(cell(form, valueCell("items[0].sku")), "a");
  assert.equal(cell(form, valueCell("items[2].tags[1].label")), "c1");
});

test("an outer splice carries the inner lists row order with the row", () => {
  const form = build();
  const tagsOfRowB = cell(form, rowsCell("items[1].tags"));
  form.rows("items").remove(0);

  assert.deepEqual(
    form.readRoot().items.map((row) => row.sku),
    ["b", "c"]
  );
  assert.deepEqual(
    cell(form, rowsCell("items[0].tags")),
    tagsOfRowB,
    "row b kept the ids of its own tags"
  );
  assert.equal(cell(form, rowsCell("items[1].tags")).length, 2, "row c has two");
  assert.equal(
    cell(form, rowsCell("items[2].tags")),
    undefined,
    "the vacated row keeps no order"
  );
});

test("a splice carries the participation mark with the row", () => {
  const form = build({
    items: [
      { sku: "a", tags: [] },
      { sku: "", tags: [] },
    ],
  });
  form.setParticipating("items[1]", false);
  form.validate();
  assert.equal(cell(form, errorCountCell), 0, "the empty sku is switched off");

  form.rows("items").remove(0);
  form.validate();

  assert.equal(
    cell(form, participatingCell("items[0]")),
    false,
    "the mark moved with the row"
  );
  assert.equal(
    cell(form, errorCountCell),
    0,
    "and the row that was switched off is still the one that is silent"
  );
});

// The defect: the splice moved the issue cell while the record of which paths
// carried issues still named the old one, so nothing was left that would ever
// write the moved error away.
test("an error carried by a splice can still be cleared", () => {
  const form = build({
    items: [
      { sku: "a", tags: [] },
      { sku: "", tags: [] },
    ],
  });
  form.validate();
  assert.equal(cell(form, issuesCell("items[1].sku")).length, 1);

  form.rows("items").remove(0);
  assert.equal(
    cell(form, issuesCell("items[0].sku")).length,
    1,
    "the error travelled with its row"
  );
  assert.equal(
    cell(form, issuesCell("items[0].sku"))[0].path,
    "items[0].sku",
    "and was re-addressed to where it now lives"
  );

  form.field("items[0].sku").setValue("fixed");
  form.validate();
  assert.deepEqual(
    cell(form, issuesCell("items[0].sku")),
    [],
    "fixing it clears it"
  );
  assert.equal(cell(form, errorCountCell), 0);
});

// The defect: the carried value was read from the CELL, so a row whose cells
// were never written had undefined carried over the top of a live value. A row
// added after the form was made is exactly that row: seeding happens once, and
// an insert writes the root and the order, not the new row's member cells.
test("a splice carries the value of a row added after the form was made", () => {
  const form = build({
    items: [
      { sku: "a", tags: [] },
      { sku: "b", tags: [] },
    ],
  });
  form.rows("items").insert(1, { sku: "NEW", tags: [] });
  assert.equal(
    cell(form, valueCell("items[1].sku")),
    undefined,
    "nothing has written the new row's cell"
  );

  form.rows("items").remove(0);

  assert.deepEqual(
    form.readRoot().items.map((row) => row.sku),
    ["NEW", "b"]
  );
  assert.equal(
    cell(form, valueCell("items[0].sku")),
    "NEW",
    "read from the root, not from a cell nothing had written"
  );
});

test("a splice carries the value of a seeded row", () => {
  const form = build();
  form.rows("items").remove(0);
  assert.equal(cell(form, valueCell("items[0].sku")), "b");
  assert.equal(cell(form, valueCell("items[1].tags[0].label")), "c0");
});

test("a flag travels and the vacated row keeps nothing", () => {
  const form = build();
  form.field("items[2].sku").markTouched();
  form.rows("items").remove(0);
  assert.equal(cell(form, touchedCell("items[1].sku")), true);
  assert.equal(cell(form, touchedCell("items[2].sku")), undefined);
});

// The defect: a fractional index matched no row, which made every row look
// removed and destroyed the whole list.
test("a fractional index is truncated rather than destroying the list", () => {
  const form = build();
  form.rows("items").remove(1.7);
  assert.deepEqual(
    form.readRoot().items.map((row) => row.sku),
    ["a", "c"],
    "row 1 was removed"
  );
  assert.equal(cell(form, valueCell("items[1].sku")), "c");
  assert.equal(cell(form, rowsCell("items[0].tags")).length, 3);
});

test("an index that is not a number leaves the list alone", () => {
  const form = build();
  form.rows("items").remove(Number.NaN);
  assert.deepEqual(
    form.readRoot().items.map((row) => row.sku),
    ["b", "c"],
    "NaN reads as index 0"
  );
  assert.equal(cell(form, rowsCell("items")).length, 2);
});

// The defect: a structural edit rewrote the array's own cell but not the
// containers around it, so a component reading the row object went stale.
test("a structural edit refreshes the containers somebody is reading", () => {
  const form = build();
  const seen = [];
  const source = form.field("items").sources.value;
  const stop = source.subscribe(() => seen.push(source.read()));

  form.rows("items").remove(0);

  assert.equal(seen.length > 0, true, "the container reader was woken");
  assert.deepEqual(
    source.read().map((row) => row.sku),
    ["b", "c"],
    "and reads what the root now holds"
  );
  stop();
});

test("a nested container is refreshed too", () => {
  const form = build();
  const source = form.field("items[0].tags").sources.value;
  const stop = source.subscribe(() => undefined);

  form.rows("items[0].tags").remove(0);

  assert.deepEqual(
    source.read().map((tag) => tag.label),
    ["a1", "a2"]
  );
  stop();
});
