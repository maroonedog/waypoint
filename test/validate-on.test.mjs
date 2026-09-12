// `validateOn`, and the signal that replaced the debounce knob.
//
// Both are counted rather than observed through what is on screen. The whole
// claim of `validateOn` is about HOW MANY PASSES RUN, so a test that asserted
// on an issue cell would pass under a runtime that judged on every keystroke
// and happened to produce the same verdict. So the adapter here counts its own
// calls, and every assertion is a count.
//
// The moment rule these pin, in one line: a VALUE EDIT asks for a pass only at
// the configured moment — except once `submitCount > 0`, after which a value
// edit always asks, because a person fixing the field the form just complained
// about has to see the complaint go.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createForm } from "@maroonedog/waypoint/core";

const FIELDS = [
  { path: "name", kind: "string", isRequired: true, constraints: {} },
  { path: "email", kind: "string", isRequired: true, constraints: {} },
];

/** An adapter that counts, and refuses an empty name. */
const countingAdapter = () => {
  const counted = { passes: 0 };
  return {
    counted,
    adapter: {
      fields: FIELDS,
      validate(root) {
        counted.passes += 1;
        const name = root?.name;
        return typeof name === "string" && name.length > 0
          ? []
          : [{ path: "name", message: "a name is required" }];
      },
    },
  };
};

const build = (validateOn) => {
  const { counted, adapter } = countingAdapter();
  const form = createForm({
    adapter,
    defaultValues: { name: "Ada", email: "ada@example.com" },
    ...(validateOn === undefined ? {} : { validateOn }),
  });
  return { form, counted };
};

const settle = () => new Promise((done) => setTimeout(done, 0));

test("the default judges on change, which is what it always did", async () => {
  const { form, counted } = build();
  counted.passes = 0;
  form.field("name").setValue("Ad");
  await settle();
  assert.equal(counted.passes, 1);
});

test("`blur` does not judge on a keystroke and does judge on a blur", async () => {
  const { form, counted } = build("blur");
  counted.passes = 0;

  form.field("name").setValue("Ad");
  form.field("name").setValue("A");
  await settle();
  assert.equal(counted.passes, 0, "no pass for either keystroke");

  form.field("name").markTouched();
  await settle();
  assert.equal(counted.passes, 1, "one pass for the blur");
});

test("`submit` judges on neither, and `validate()` still judges now", async () => {
  const { form, counted } = build("submit");
  counted.passes = 0;

  form.field("name").setValue("Ad");
  form.field("name").markTouched();
  await settle();
  assert.equal(counted.passes, 0);

  form.validate();
  assert.equal(counted.passes, 1, "an explicit ask is not a moment");
});

test("a rejected submit turns change-time judging back on, under every setting", async () => {
  for (const validateOn of ["blur", "submit"]) {
    const { form, counted } = build(validateOn);

    form.field("name").setValue("");
    const refused = await form.submit(() => {});
    assert.equal(refused.submitted, false, validateOn);

    counted.passes = 0;
    form.field("name").setValue("A");
    await settle();
    assert.equal(
      counted.passes,
      1,
      `${validateOn}: fixing the field the form complained about has to clear it`
    );
  }
});

test("a structural edit judges under every setting, because it moves what blocks", async () => {
  for (const validateOn of ["change", "blur", "submit"]) {
    const { form, counted } = build(validateOn);
    counted.passes = 0;
    form.setParticipating("email", false);
    await settle();
    assert.equal(counted.passes, 1, validateOn);
  }
});

test("`validateOn` is on the form and there is no per-field member", () => {
  const { form } = build("blur");
  const field = form.field("name");
  assert.equal(
    Object.keys(field).includes("validateOn"),
    false,
    "one pass judges the whole root, so a per-field moment could not be kept"
  );
});

// ---- the signal that replaced the debounce knob ---------------------------

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
