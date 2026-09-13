// A validator that has to ask something, and what the runtime does while it
// waits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import {
  createForm,
  errorCountCell,
  issuesCell,
  validatingCell,
} from "@maroonedog/waypoint/core";

const SCHEMA = z.object({ handle: z.string().min(1, "required") });

const TAKEN = "taken";

/** Wraps a synchronous adapter in one that also asks a slow question. */
const askingAdapter = (settle) => {
  const base = zodFormResolver(SCHEMA);
  return {
    fields: base.fields,
    validate(root) {
      const local = base.validate(root);
      return settle(root).then((remote) => [...local, ...remote]);
    },
  };
};

/** Answers straight away, one microtask later. */
const uniquenessCheck = async (root) =>
  root?.handle === TAKEN
    ? [{ path: "handle", message: "that handle is taken", code: "taken" }]
    : [];

const build = (adapter, defaultValues = { handle: "" }) =>
  createForm({ adapter, defaultValues: structuredClone(defaultValues) });

test("an asynchronous verdict lands once it settles", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: TAKEN });
  const outcome = form.validate();
  assert.equal(typeof outcome.then, "function", "the caller gets a promise");

  const produced = await outcome;
  assert.deepEqual(
    produced.map((issue) => issue.code),
    ["taken"]
  );
  assert.deepEqual(
    form.store.read(issuesCell("handle")).map((issue) => issue.code),
    ["taken"]
  );
  assert.equal(form.store.read(errorCountCell), 1);
});

test("the form says it is validating only while a pass is in flight", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: TAKEN });
  assert.equal(form.store.read(validatingCell), false);

  const outcome = form.validate();
  assert.equal(form.store.read(validatingCell), true, "in flight");

  await outcome;
  assert.equal(form.store.read(validatingCell), false, "settled");
});

test("a synchronous validator never raises the flag", () => {
  const form = build(zodFormResolver(SCHEMA));
  form.validate();
  assert.equal(form.store.read(validatingCell), false);
});

// A late answer describes a root that is no longer there. Committing it would
// flicker the form back to the verdict for what was typed before.
test("an answer overtaken by a newer pass is discarded", async () => {
  const waiting = [];
  const form = build(
    askingAdapter(
      () => new Promise((resolve) => waiting.push(resolve))
    ),
    { handle: "first" }
  );

  const first = form.validate();
  form.field("handle").setValue("second");
  const second = form.validate();
  assert.ok(waiting.length >= 2, "more than one pass is in flight");

  // The newer one answers first, then the older one arrives late.
  waiting[1]([]);
  await second;
  const shown = () => form.field("handle").sources.issues.read();
  assert.deepEqual(shown(), []);

  waiting[0]([{ path: "handle", message: "stale", code: "stale" }]);
  await first;
  assert.deepEqual(shown(), [], "the late answer was dropped");

  // The edit also asked for a coalesced pass of its own; letting it answer is
  // what returns the form to rest.
  for (const resolve of waiting.slice(2)) resolve([]);
  await new Promise((settle) => setTimeout(settle, 0));
  assert.equal(form.store.read(validatingCell), false, "nothing is stuck");
});

test("submit waits for the asking validator before it decides", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: TAKEN });
  let handed = false;
  const outcome = await form.submit(() => {
    handed = true;
  });
  assert.equal(handed, false);
  assert.equal(outcome.submitted, false);
  assert.deepEqual(
    outcome.blockedBy.map((issue) => issue.code),
    ["taken"]
  );
});

test("submit hands over once the asking validator is content", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: "free" });
  const outcome = await form.submit(() => undefined);
  assert.deepEqual(outcome, { submitted: true, blockedBy: [] });
});

test("one field can be validated on its own, asynchronously", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: TAKEN });
  const issues = await form.field("handle").validate();
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["taken"]
  );
});

test("check asks without writing anything", async () => {
  const form = build(askingAdapter(uniquenessCheck), { handle: "free" });
  const before = JSON.stringify(form.readRoot());
  const issues = await form.field("handle").issuesFor(TAKEN);
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["taken"]
  );
  assert.equal(JSON.stringify(form.readRoot()), before, "nothing was written");
  assert.deepEqual(form.store.read(issuesCell("handle")), undefined);
});

// An error reaching whatever it asked is not evidence that the form became
// acceptable, so the last verdict stands.
test("a pass that fails leaves the previous verdict alone", async () => {
  let shouldFail = false;
  const form = build(
    askingAdapter(async (root) => {
      if (shouldFail) throw new Error("the network said no");
      return uniquenessCheck(root);
    }),
    { handle: TAKEN }
  );

  await form.validate();
  assert.equal(form.store.read(errorCountCell), 1);

  shouldFail = true;
  await assert.rejects(() => form.validate(), /the network said no/);
  assert.equal(
    form.store.read(errorCountCell),
    1,
    "the verdict from before still stands"
  );
  assert.equal(form.store.read(validatingCell), false, "and nothing is stuck");
});
