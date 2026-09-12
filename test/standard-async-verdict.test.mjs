// A promise has to survive three hops, and each hop can lose it differently.
//
// `~standard.validate` is allowed to return one, so an async verdict is not an
// edge case a vendor opted into — it is the spec, and the interesting part is
// that every layer between that call and a rendered error has a plausible way
// of quietly getting it wrong.
//
// The adapter can AWAIT it, which looks correct from inside: the value is
// right, the test passes, and the form has simply stopped being able to tell a
// caller that a verdict is still outstanding. It can also MANUFACTURE one where
// the vendor returned a value — also correct-looking, and it puts a microtask
// between a keystroke and its verdict on the common path, which is exactly what
// `MaybeAsync` being a union rather than a promise exists to prevent. Both are
// pinned here as what the adapter does NOT do.
//
// The third hop is a different kind of test and that is the reason this file
// exists rather than the length of the other one. The first two call a function
// and look at what came back; the last builds a form, drives it, and reads a
// cell. It fails when the store never settles, not when a value is wrong, and
// it is debugged with error counts and field sources rather than by reading a
// return value — a different tool, a different place to look, and no overlap
// with the question the rest of the family asks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import { createForm, errorCountCell } from "@maroonedog/waypoint/core";
import { asyncSchema, bothHalves } from "./support/standard-schema-doubles.mjs";

test("an async verdict is passed on as a promise rather than awaited here", async () => {
  const adapter = standardFormResolver(
    asyncSchema([{ message: "taken", path: ["owner", "name"] }])
  );
  const outcome = adapter.validate({});
  assert.equal(typeof outcome.then, "function");
  assert.deepEqual(await outcome, [
    { path: "owner.name", message: "taken" },
  ]);
});

test("a synchronous vendor stays synchronous end to end", () => {
  // `MaybeAsync` is a union and not a promise precisely so that the common
  // case does not get a microtask between a keystroke and the verdict.
  const outcome = standardFormResolver(bothHalves()).validate({});
  assert.equal(Array.isArray(outcome), true);
});

test("the runtime drives an async standard adapter to a settled verdict", async () => {
  const form = createForm({
    adapter: standardFormResolver(
      asyncSchema([{ message: "taken", path: ["owner", "name"] }])
    ),
    defaultValues: { owner: { name: "Ada", nickname: "" }, items: [] },
  });
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 1);
  assert.equal(
    form.field("owner.name").sources.issues.read()[0].message,
    "taken"
  );
  assert.equal(form.field("owner.name").descriptor.constraints.minLength, 3);
});
