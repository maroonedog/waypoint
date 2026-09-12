// `validateOn`: how many passes a value edit asks for.
//
// Counted rather than observed through what is on screen. The whole claim of
// `validateOn` is about HOW MANY PASSES RUN, so a test that asserted on an
// issue cell would pass under a runtime that judged on every keystroke and
// happened to produce the same verdict. So the adapter here counts its own
// calls, and every moment rule below is settled by that count. The last test is
// the one exception and is not about a moment: it asserts that `validateOn` has
// no per-field member, which is a shape a count cannot reach.
//
// The moment rule these pin, in one line: a VALUE EDIT asks for a pass only at
// the configured moment — except once `submitCount > 0`, after which a value
// edit always asks, because a person fixing the field the form just complained
// about has to see the complaint go.
//
// What a running pass is TOLD when a newer one starts is a different question
// and is next door, in validate-signal.test.mjs. Nothing here would notice an
// abort: the adapter below answers immediately, so every pass it is asked for
// is a pass it finishes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createForm } from "@maroonedog/waypoint/core";
import { FIELDS, settle } from "./support/scheduled-pass.mjs";

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
