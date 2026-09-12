// axe-core over rendered forms: four cases and the gate that gives them
// meaning.
//
// WHY THIS FILE IS NOT SPLIT, though it is one of the longer ones. The four
// cases are not four claims. They are one — "the markup this library tells a
// caller to render passes axe" — asserted over the range that makes it worth
// asserting: every field kind, a closed field, a described field, a field in
// error, a growable list, an error summary, which the second case carries
// three of. Cut in two and neither half is that claim; each becomes "some of
// the markup passes", which is what an accessibility suite is always accused
// of and which the range exists to answer. The gate below makes the same
// argument arithmetically: it compares the union of rules that fired across
// all four against the record, so a case leaving this file does not merely
// take its own coverage with it, it fails the last test.
//
// WHY THE MARKUP, THE DOCUMENT AND THE RUNNER ARE IN
// accessibility-axe.harness.mjs and not here. Those are the two levers that
// turn a failing accessibility run green without fixing anything — edit the
// markup until the rule stops matching, or narrow what the run measures — and
// they are kept out of reach of the case that went red on purpose. The harness
// argues that at length. What is left here is what each case actually asserts.
// It is named after this file and sits beside it because it serves this file
// alone; test/support/ is for modules more than one test file imports.
//
// It is gated inside `npm test`, which is what `npm run verify` runs and what
// CI runs, for the reason verify.yml gives about the tests themselves: a
// benchmark drifting is a number to re-record, an accessibility defect is a
// defect shipping.
//
// WHAT IS AND IS NOT PROVEN. axe-core finds machine-decidable defects in the
// rendered document. It does not read a label aloud, it does not judge whether
// the wording helps, and nothing here has met a real screen reader or an
// auditor. docs/accessibility-criteria.md says criterion by criterion which
// half of that is which.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE,
  EVERY_KIND,
  act,
  audit,
  axe,
  descriptor,
  errorSummaryScreen,
  fieldsScreen,
  rowsScreen,
  seen,
  sorted,
  staticAdapter,
  writeRecordWhenAsked,
} from "./accessibility-axe.harness.mjs";

const { z } = await import("zod");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");

test("every FormFieldKind draws a control axe accepts", async () => {
  const form = createForm({
    adapter: staticAdapter(EVERY_KIND),
    defaultValues: {},
  });
  const report = await audit(
    "every kind",
    fieldsScreen(form, EVERY_KIND.map((field) => field.path))
  );
  assert.ok(
    report.decided.includes("label"),
    "the `label` rule has to have actually run for this to mean anything"
  );
});

test("a closed field, a described field and a field in error", async () => {
  const fields = [
    descriptor("size", "string", {
      choices: [
        { value: "s", label: "Small" },
        { value: "l", label: "Large" },
      ],
      label: "Size",
    }),
    descriptor("card", "string", {
      label: "Card number",
      description: "As it appears on the card",
    }),
    descriptor("postcode", "string", { label: "Postcode", isRequired: true }),
  ];
  const form = createForm({
    adapter: staticAdapter(fields, [
      { path: "postcode", message: "Enter a real postcode." },
    ]),
    defaultValues: { size: "", card: "", postcode: "" },
  });
  await act(async () => {
    await form.validate();
  });

  const report = await audit(
    "choices, description, error",
    fieldsScreen(form, ["size", "card", "postcode"])
  );
  assert.ok(
    report.decided.includes("aria-valid-attr-value"),
    "aria-describedby and aria-invalid have to have been resolved"
  );
});

test("a list of rows", async () => {
  const ITEMS = z.object({
    items: z.array(
      z.object({
        sku: z.string().min(1).meta({ title: "Item code" }),
        quantity: z.number().meta({ title: "Quantity" }),
      })
    ),
  });
  const form = createForm({
    adapter: zodFormResolver(ITEMS),
    defaultValues: { items: [{ sku: "a", quantity: 1 }, { sku: "", quantity: 2 }] },
  });
  await act(async () => {
    await form.validate();
  });

  await audit("a list", rowsScreen(form, "items"));
});

test("the error summary, spread onto the markup its two bags imply", async () => {
  const fields = [
    descriptor("name", "string", { label: "Full name", isRequired: true }),
    descriptor("email", "string", { label: "Email address", isRequired: true }),
  ];
  const form = createForm({
    adapter: staticAdapter(fields, [
      { path: "name", message: "Enter your full name." },
      { path: "email", message: "Enter an email address." },
    ]),
    defaultValues: { name: "", email: "" },
  });
  await act(async () => {
    await form.validate();
  });

  await audit(
    "the error summary",
    errorSummaryScreen(form, ["name", "email"])
  );
});

// ---------------------------------------------------------------------------
// The gate. It runs last, over what every case above accumulated.
// ---------------------------------------------------------------------------

test("the rules that ran, and the ones that could not, are the recorded ones", () => {
  const found = {
    ...BASELINE,
    axeVersion: axe.version,
    decided: sorted(seen.decided),
    undecided: sorted(seen.undecided),
  };
  if (writeRecordWhenAsked(found)) return;
  assert.equal(
    axe.version,
    BASELINE.axeVersion,
    "axe-core moved; re-read the rule lists before re-recording them"
  );
  assert.deepEqual(
    sorted(seen.decided),
    BASELINE.decided,
    "a rule reached a verdict that the record does not list, or stopped " +
      "reaching one. Either is worth a look before the file is updated."
  );
  assert.deepEqual(
    sorted(seen.undecided),
    BASELINE.undecided,
    "a rule reported `incomplete` — it matched elements and could not reach " +
      "a verdict. That is a rule this suite is not checking, and it has to be " +
      "named in notRunUnderJsdom with the reason rather than left here."
  );
  assert.ok(
    Object.keys(BASELINE.notRunUnderJsdom).length > 0,
    "the list of rules this environment cannot run is the honest half of the " +
      "record, and an empty one would be a claim rather than a measurement"
  );
});
