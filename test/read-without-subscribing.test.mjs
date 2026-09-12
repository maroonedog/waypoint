// Reading a value and being told when it changes are two different things, and
// a reader is entitled to do only the first.
//
// The fan-out maintains the root, the path just edited, and whatever cells are
// open. A container nobody is watching is therefore left holding the value it
// had when its last reader went away, and a row inserted while nobody was
// looking has no cell at all. Both of those used to come back from `read()` as
// the form's answer.
//
// React never exercised it: useSyncExternalStore subscribes and then reads. A
// plain subscriber writes the obvious thing — read now, subscribe for later —
// and that order is what was wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createForm } from "@maroonedog/waypoint/core";

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3, "3文字以上") }),
  items: z.array(z.object({ sku: z.string().min(1, "必須") })).min(1),
});

const newForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: { owner: { name: "Ada" }, items: [{ sku: "a" }, { sku: "b" }] },
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const valueAt = (form, path) => form.field(path).sources.value.read();

test("a container nobody has ever subscribed reads its current value", () => {
  const form = newForm();
  assert.deepEqual(valueAt(form, "owner"), { name: "Ada" });
  assert.deepEqual(valueAt(form, "items"), [{ sku: "a" }, { sku: "b" }]);
  assert.equal(valueAt(form, "items[1].sku"), "b");
});

test("a container that was open, then closed, does not answer with the stale value", () => {
  const form = newForm();
  const owner = form.field("owner").sources.value;
  const stop = owner.subscribe(() => undefined);
  assert.deepEqual(owner.read(), { name: "Ada" });
  stop();

  // Nobody is watching `owner` now, so the fan-out stops writing it — but the
  // form has still moved underneath.
  form.field("owner.name").setValue("Grace");
  assert.deepEqual(owner.read(), { name: "Grace" });
});

test("a row inserted while nobody was looking reads its own value", async () => {
  const form = newForm();
  form.rows("items").insert(2, { sku: "c" });
  await settle();

  // Exactly the shape a plain DOM binding takes: draw each row, read it, then
  // subscribe for later changes.
  const drawn = form
    .rows("items")
    .ids.read()
    .map((_id, index) => valueAt(form, `items[${index}].sku`));

  assert.deepEqual(drawn, ["a", "b", "c"]);
});

test("read-then-subscribe sees what subscribe-then-read sees", () => {
  const form = newForm();
  form.rows("items").insert(2, { sku: "c" });

  const source = form.field("items[2].sku").sources.value;
  const readFirst = source.read();
  const stop = source.subscribe(() => undefined);
  const readAfter = source.read();
  stop();

  assert.equal(readFirst, "c");
  assert.equal(readAfter, "c");
});

test("an open cell still reads and still notifies", async () => {
  const form = newForm();
  const source = form.field("items[0].sku").sources.value;
  const seen = [];
  const stop = source.subscribe(() => seen.push(source.read()));

  form.field("items[0].sku").setValue("z");
  await settle();

  assert.deepEqual(seen, ["z"]);
  assert.equal(source.read(), "z");
  stop();
});

test("issues and flags are unaffected — only the value channel derives", async () => {
  const form = newForm();
  form.field("owner.name").setValue("Ad");
  await settle();

  const field = form.field("owner.name");
  assert.equal(field.sources.issues.read()[0]?.message, "3文字以上");
  assert.equal(field.sources.dirty.read(), true);
  assert.equal(field.sources.touched.read(), false);
});
