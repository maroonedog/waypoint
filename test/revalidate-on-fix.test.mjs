// A complaint does not outlive the value it was about.
//
// `adopted-issues.ts` states the rule and applies it to what a SERVER said: a
// write at a path, at any ancestor of it or at any descendant drops a verdict
// about that path, because "this row is a duplicate" does not survive an edit
// inside the row. What the SCHEMA said was exempt from the same rule under
// `validateOn: "blur"` — the verdict was published at the last blur and then
// stayed through the whole time the reader spent fixing the field, with
// `aria-invalid` set on a value that was by then correct.
//
// So these tests are about one thing said two ways: an edit to a field that is
// currently complaining asks for a pass, whatever `validateOn` says, and an
// edit to a field that is NOT complaining still does not — which is the whole
// point of having asked for fewer passes.
import { test } from "node:test";
import assert from "node:assert/strict";

const { z } = await import("zod");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");

const SCHEMA = z.object({
  a: z.string().min(3, "a needs 3"),
  b: z.string().min(3, "b needs 3"),
  // Both bounds, so a complaint ABOUT THE LIST can coexist with rows to type
  // in — which is the only arrangement the ancestor clause can be seen in.
  items: z
    .array(z.object({ sku: z.string() }))
    .min(1, "at least one line")
    .max(1, "at most one line"),
});

/** The adapter, with every pass counted. */
const build = (validateOn) => {
  const inner = zodFormResolver(SCHEMA);
  const counted = { passes: 0 };
  const form = createForm({
    adapter: {
      fields: inner.fields,
      validate: (root) => {
        counted.passes += 1;
        return inner.validate(root);
      },
    },
    defaultValues: { a: "", b: "", items: [{ sku: "x" }] },
    ...(validateOn === undefined ? {} : { validateOn }),
  });
  return { form, counted };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const says = (form, path) =>
  form.field(path).sources.issues.read()[0]?.message ?? "";

test("under blur, fixing the field that complained clears it without a blur", async () => {
  const { form } = build("blur");
  form.field("a").markTouched();
  await settle();
  assert.equal(says(form, "a"), "a needs 3", "the blur published it");

  form.field("a").setValue("Ada");
  await settle();
  assert.equal(says(form, "a"), "", "and the edit that fixed it cleared it");
});

test("under blur, a field nobody has complained about still asks for nothing", async () => {
  const { form, counted } = build("blur");
  await settle();
  const before = counted.passes;
  form.field("b").setValue("x");
  await settle();
  assert.equal(
    counted.passes,
    before,
    "asking for fewer passes still means fewer passes"
  );
  assert.equal(says(form, "b"), "");
});

test("under submit, nothing is judged until one is refused", async () => {
  const { form, counted } = build("submit");
  form.field("a").setValue("x");
  form.field("a").markTouched();
  await settle();
  assert.equal(counted.passes, 0);

  const outcome = await form.submit(() => undefined);
  assert.equal(outcome.submitted, false);
  assert.equal(says(form, "a"), "a needs 3");

  const afterSubmit = counted.passes;
  form.field("a").setValue("Ada");
  await settle();
  assert.ok(counted.passes > afterSubmit, "and then edits re-judge");
  assert.equal(says(form, "a"), "");
});

test("an edit inside a row re-judges a complaint about the row", async () => {
  const { form } = build("blur");
  form.rows("items").remove(0);
  await settle();
  assert.equal(
    says(form, "items"),
    "at least one line",
    "a row edit judges under every setting"
  );

  form.rows("items").insert(0, { sku: "y" });
  await settle();
  assert.equal(says(form, "items"), "");
});

test("the ancestor clause: a keystroke below a complaint asks for the pass", async () => {
  const { form, counted } = build("blur");
  // A second row breaks the list's own rule while leaving a leaf to type in.
  form.rows("items").insert(1, { sku: "" });
  await settle();
  assert.equal(says(form, "items"), "at most one line");
  assert.equal(says(form, "items[0].sku"), "", "the leaf itself is fine");

  const before = counted.passes;
  form.field("items[0].sku").setValue("y");
  await settle();
  assert.equal(
    counted.passes,
    before + 1,
    "the complaint above it is what asked"
  );

  // And with the list satisfied again, a keystroke in the same leaf asks for
  // nothing — so it is the complaint doing the asking and not the nesting.
  form.rows("items").remove(1);
  await settle();
  assert.equal(says(form, "items"), "");
  const quiet = counted.passes;
  form.field("items[0].sku").setValue("z");
  await settle();
  assert.equal(counted.passes, quiet, "nothing to make stale, nothing asked");
});

test("under change, none of this changes anything", async () => {
  const { form, counted } = build();
  const before = counted.passes;
  form.field("b").setValue("x");
  await settle();
  assert.equal(counted.passes, before + 1, "every edit judged, as it always did");
});
