// The order a summary lists in, which is decided with no document anywhere.
//
// The defect this exists to fix is a summary that lists fields in the order
// the validator happened to walk the schema, and `summarizeIssues` is where
// the fix lives. So the descriptors here are hand-built leaves, and every test
// with more than one path to order hands its issues over shuffled — never in
// the order a tree walk would produce. The two that do not are the two with
// nothing to shuffle: one path with three complaints, and one path with one.
// That is the design, not a shortcut: issues that arrive already in the right
// order cannot tell a working sort from no sort at all, and issues produced by
// a real validator arrive in whatever order it walked, which is not something
// the test controls. Shuffling them is the test.
//
// The row cases carry the most tests because they are the ones a flat
// (declaration slot, indices) sort key gets wrong, and it gets them wrong by
// producing a list that still looks plausible — items[0].sku, items[1].sku,
// items[0].quantity reads like an order somebody chose.
//
// Ordering needs no page and nothing here installs one. Where the reader ends
// up once the list is drawn is error-summary-react.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDescriptorTree,
  summarizeIssues,
} from "@maroonedog/waypoint/core";

const leaf = (path, label) => ({
  path,
  kind: "string",
  isRequired: false,
  constraints: {},
  ...(label === undefined ? {} : { label }),
});

const complaint = (path, message) => ({ path, message });

const orderOf = (descriptors, issues) =>
  summarizeIssues({ tree: buildDescriptorTree(descriptors), issues }).map(
    (entry) => entry.path
  );

test("entries follow declaration order, not the order the issues arrived", () => {
  const descriptors = [
    leaf("name"),
    leaf("email"),
    leaf("postcode"),
  ];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("postcode", "c"),
      complaint("name", "a"),
      complaint("email", "b"),
    ]),
    ["name", "email", "postcode"]
  );
});

test("a row's fields stay together instead of every row's first field first", () => {
  // The case a flat (declaration slot, indices) key gets wrong: `sku` is slot
  // 0 and `quantity` is slot 1, so sorting on the slot first would produce
  // items[0].sku, items[1].sku, items[0].quantity — which is not what anybody
  // reading down the page meets.
  const descriptors = [leaf("items[*].sku"), leaf("items[*].quantity")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("items[1].quantity", "d"),
      complaint("items[0].quantity", "b"),
      complaint("items[1].sku", "c"),
      complaint("items[0].sku", "a"),
    ]),
    ["items[0].sku", "items[0].quantity", "items[1].sku", "items[1].quantity"]
  );
});

test("a nested row interleaves at both depths", () => {
  const descriptors = [leaf("orders[*].id"), leaf("orders[*].lines[*].sku")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("orders[1].lines[0].sku", "e"),
      complaint("orders[0].lines[1].sku", "c"),
      complaint("orders[1].id", "d"),
      complaint("orders[0].lines[0].sku", "b"),
      complaint("orders[0].id", "a"),
    ]),
    [
      "orders[0].id",
      "orders[0].lines[0].sku",
      "orders[0].lines[1].sku",
      "orders[1].id",
      "orders[1].lines[0].sku",
    ]
  );
});

test("an issue on the array itself sorts above the rows it contains", () => {
  const descriptors = [leaf("name"), leaf("items[*].sku")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("items[0].sku", "b"),
      complaint("items", "at least one"),
      complaint("name", "a"),
    ]),
    ["name", "items", "items[0].sku"]
  );
});

test("a path the tree cannot place goes last, in the order it arrived", () => {
  const descriptors = [leaf("name")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("payment", "the card was declined"),
      complaint("account", "already taken"),
      complaint("name", "required"),
    ]),
    ["name", "payment", "account"]
  );
});

test("one field with three complaints is one entry carrying all three", () => {
  const entries = summarizeIssues({
    tree: buildDescriptorTree([leaf("password", "Password")]),
    issues: [
      complaint("password", "too short"),
      complaint("password", "needs a digit"),
      complaint("password", "needs a symbol"),
    ],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].label, "Password");
  assert.equal(entries[0].message, "too short", "the first one is the line");
  assert.equal(entries[0].issues.length, 3);
});

test("no label is invented for a field whose schema declared none", () => {
  const entries = summarizeIssues({
    tree: buildDescriptorTree([leaf("owner.name")]),
    issues: [complaint("owner.name", "required")],
  });
  assert.equal(entries[0].label, undefined, "not `Owner name`, not the path");
  assert.equal(entries[0].path, "owner.name");
});
