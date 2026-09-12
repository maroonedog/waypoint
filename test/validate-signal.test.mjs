// The signal an adapter is handed, which is what stands where a debounce knob
// would otherwise be.
//
// WHY THERE IS NO DELAY SETTING. A debounce answers a question about cost — a
// rule that costs a network round trip must not run on every keystroke — by
// picking a number, and the number cannot be picked from in here. The delay
// that is long enough for a slow rule is a delay a fast typist can feel, and
// the library knows neither the rule nor the typist. So the pass is not
// delayed, it is ABORTED when a newer one overtakes it, and the adapter is the
// one told, because the adapter is the only party that knows what it can stop
// doing.
//
// WHAT THESE ASSERT ON, and it is deliberately neither of the two things a
// validation test normally looks at. Not the verdict: an aborted pass and a
// finished one leave the same issue list behind, because the abort is a
// message to the adapter rather than a change to the result, so a test reading
// issues could not tell the two apart. Not the count either — how many passes
// run is the subject of validate-on.test.mjs, and here a pass being started is
// what is assumed rather than what is in question. What is in question is the
// second argument itself: whether one arrives, whether a controller is built
// for an adapter that never asked for a signal, and what `aborted` reads at
// the moment a newer pass begins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createForm } from "@maroonedog/waypoint/core";
import { FIELDS, settle } from "./support/scheduled-pass.mjs";

test("an adapter that declares one parameter is never handed a signal", async () => {
  const seen = [];
  const form = createForm({
    adapter: {
      fields: FIELDS,
      validate(root) {
        assert.equal(arguments.length <= 2, true);
        seen.push(arguments[1]);
        return [];
      },
    },
    defaultValues: { name: "Ada", email: "ada@example.com" },
  });
  await form.validate();
  assert.deepEqual(seen, [undefined], "no controller is constructed for it");
});

test("an adapter that asks for a signal is handed one, and it starts unaborted", async () => {
  let handed;
  const form = createForm({
    adapter: {
      fields: FIELDS,
      validate(root, signal) {
        handed = signal;
        return [];
      },
    },
    defaultValues: { name: "Ada", email: "ada@example.com" },
  });
  await form.validate();
  assert.notEqual(handed, undefined);
  assert.equal(handed.aborted, false);
});

test("a superseded pass is aborted, which is what the delay knob was asked for", async () => {
  const handed = [];
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const form = createForm({
    adapter: {
      fields: FIELDS,
      validate(root, signal) {
        handed.push(signal);
        // The first pass waits; the second answers at once, exactly as a
        // network rule overtaken by a keystroke would.
        return handed.length === 1 ? held.then(() => []) : [];
      },
    },
    defaultValues: { name: "Ada", email: "ada@example.com" },
  });

  const first = form.validate();
  assert.equal(handed[0].aborted, false);

  form.field("name").setValue("Ad");
  await settle();

  assert.equal(handed.length, 2, "the keystroke started a newer pass");
  assert.equal(
    handed[0].aborted,
    true,
    "the older pass is told its answer is already going to be discarded"
  );
  assert.equal(handed[1].aborted, false, "the newest pass is live");

  release();
  await first;
});

test("the newest pass is not aborted by its own start", async () => {
  const handed = [];
  const form = createForm({
    adapter: {
      fields: FIELDS,
      validate(root, signal) {
        handed.push(signal);
        return [];
      },
    },
    defaultValues: { name: "Ada", email: "ada@example.com" },
  });
  await form.validate();
  await form.validate();
  assert.equal(handed.length, 2);
  assert.equal(handed[1].aborted, false);
});
