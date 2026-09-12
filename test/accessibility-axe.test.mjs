// axe-core over rendered forms, gated against a recorded rule list.
//
// WHY A RULE LIST AND NOT JUST "NO VIOLATIONS". A run that finds nothing is
// two different results wearing one face: the markup is clean, or the rule
// never fired. jsdom has no layout, so `color-contrast` reaches no verdict
// here however good or bad the colours are, and a suite that reported "0
// violations" would be claiming a check it did not perform. So the run records
// WHICH rules reached a verdict and which did not, compares both against
// config/axe-coverage.json, and fails when either set moves. A rule going
// quiet — an axe upgrade, a markup change that stops matching — fails the
// build in the same way a new violation does.
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
//
// The markup below is deliberately ordinary — a label, a control, a help line,
// a message — because the four prop bags are the thing under test and the
// point is that ordinary markup spread with them comes out right. It is the
// caller's markup in the same sense the README's examples are.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html lang="en"><head><title>axe</title></head><body><main id="page"></main></body></html>`,
  { url: "http://localhost", pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
for (const name of [
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "NodeFilter",
  "DocumentFragment",
  "SVGElement",
  "getComputedStyle",
]) {
  globalThis[name] = dom.window[name];
}
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // A navigator already provided by the host is fine.
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const axe = (await import("axe-core")).default;
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FieldRows, FormProvider, useErrorSummary, useField } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h, Fragment } = React;

const BASELINE_PATH = fileURLToPath(
  new URL("../config/axe-coverage.json", import.meta.url)
);
const BASELINE = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

// ---------------------------------------------------------------------------
// The markup a caller writes, spread with the four bags and nothing else.
// ---------------------------------------------------------------------------

/**
 * A `<select>` for a closed field, a bare `<input>` for everything else — the
 * split field.tsx describes, written out because this library authors no
 * widget and the test must not pretend otherwise.
 */
function Row({ path }) {
  const field = useField(path);
  const choices = field.descriptor?.choices;
  const control =
    choices === undefined
      ? h("input", { ...field.inputProps })
      : h(
          "select",
          { ...field.inputProps },
          h("option", { value: "" }, "Choose one"),
          choices.map((choice) =>
            h(
              "option",
              { key: String(choice.value), value: String(choice.value) },
              choice.label
            )
          )
        );

  return h(
    "div",
    null,
    h("label", { ...field.labelProps }, field.descriptor?.label ?? path),
    control,
    field.descriptor?.description === undefined
      ? null
      : h("p", { ...field.descriptionProps }, field.descriptor.description),
    h(
      "p",
      { ...field.errorProps },
      field.issues.map((issue) => issue.message).join(" ")
    )
  );
}

function Fields({ paths }) {
  return h(
    Fragment,
    null,
    paths.map((path) => h(Row, { key: path, path }))
  );
}

// ---------------------------------------------------------------------------
// Running one case.
// ---------------------------------------------------------------------------

const TAGS = BASELINE.tags;

const sorted = (values) => [...new Set(values)].sort();

async function mount(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("page").appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}

/**
 * Rules switched OFF because jsdom cannot support them, each with the reason
 * in the recorded file. Disabling is not dodging: left enabled,
 * `color-contrast` reports `incomplete` and `target-size` reports a PASS for a
 * 2px button — measured, in a scratch run against jsdom 26.1.0 — because
 * `getBoundingClientRect()` returns all zeros there. A silent pass is the one
 * outcome this suite must never produce, so the rule is named and turned off
 * rather than left to answer a question it cannot see.
 */
const UNSUPPORTED = Object.fromEntries(
  Object.keys(BASELINE.notRunUnderJsdom).map((id) => [id, { enabled: false }])
);

/** @returns the rules that decided, the rules that could not, and violations. */
async function auditOf(container) {
  const result = await axe.run(container, {
    runOnly: { type: "tag", values: TAGS },
    rules: UNSUPPORTED,
  });
  return {
    violations: result.violations.map((rule) => ({
      id: rule.id,
      nodes: rule.nodes.map((node) => node.html),
    })),
    decided: sorted([
      ...result.passes.map((rule) => rule.id),
      ...result.violations.map((rule) => rule.id),
    ]),
    undecided: sorted(result.incomplete.map((rule) => rule.id)),
  };
}

/** Every case's rule ids, accumulated so the last test can compare the union. */
const seen = { decided: [], undecided: [] };

async function audit(name, element) {
  const { container, root } = await mount(element);
  const report = await auditOf(container);
  root.unmount();
  container.remove();
  assert.deepEqual(
    report.violations,
    [],
    `${name}: axe ${axe.version} found violations`
  );
  seen.decided.push(...report.decided);
  seen.undecided.push(...report.undecided);
  return report;
}

// ---------------------------------------------------------------------------
// The cases.
// ---------------------------------------------------------------------------

const descriptor = (path, kind, extra = {}) => ({
  path,
  kind,
  isRequired: false,
  constraints: {},
  label: path,
  ...extra,
});

/** One field per member of `FormFieldKind`, all eight of them. */
const EVERY_KIND = [
  "string",
  "number",
  "boolean",
  "date",
  "file",
  "array",
  "object",
  "unknown",
].map((kind) => descriptor(kind, kind));

const staticAdapter = (fields, issues = []) => ({
  fields,
  validate: () => issues,
});

test("every FormFieldKind draws a control axe accepts", async () => {
  const form = createForm({
    adapter: staticAdapter(EVERY_KIND),
    defaultValues: {},
  });
  const report = await audit(
    "every kind",
    h(
      FormProvider,
      { form },
      h("form", { noValidate: true }, h(Fields, {
        paths: EVERY_KIND.map((field) => field.path),
      }))
    )
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
    h(
      FormProvider,
      { form },
      h(
        "form",
        { noValidate: true },
        h(Fields, { paths: ["size", "card", "postcode"] })
      )
    )
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

  await audit(
    "a list",
    h(
      FormProvider,
      { form },
      h(
        "form",
        { noValidate: true },
        h(FieldRows, { path: "items" }, ({ rows, remove }) =>
          h(
            Fragment,
            null,
            rows.map((row) =>
              h(
                "fieldset",
                { key: row.key },
                h("legend", null, `Item ${row.index + 1}`),
                h(Fields, {
                  paths: [`${row.path}.sku`, `${row.path}.quantity`],
                }),
                h(
                  "button",
                  { type: "button", onClick: () => remove(row.index) },
                  `Remove item ${row.index + 1}`
                )
              )
            )
          )
        )
      )
    )
  );
});

test("the error summary, as the README tells a caller to render it", async () => {
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

  function Screen() {
    const summary = useErrorSummary();
    return h(
      "form",
      { noValidate: true, ...summary.scopeProps },
      summary.entries.length === 0
        ? null
        : h(
            "div",
            { ...summary.summaryProps },
            h("h2", null, "There is a problem"),
            h(
              "ul",
              null,
              summary.entries.map((entry) =>
                h(
                  "li",
                  { key: entry.path },
                  h(
                    "button",
                    { type: "button", onClick: entry.focus },
                    `${entry.label ?? entry.path}: ${entry.message}`
                  )
                )
              )
            )
          ),
      h(Fields, { paths: ["name", "email"] })
    );
  }

  await audit("the error summary", h(FormProvider, { form }, h(Screen)));
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
  // Re-recording is `npm run axe:record`, and it is deliberately a different
  // command from the one that fails: a list that rewrites itself when it
  // disagrees is not a gate. What it writes still has to be read.
  //
  // The switch is npm's own `npm_lifecycle_event` rather than an environment
  // variable set in the script, because `FOO=1 node …` is not a command on
  // Windows and this repository is developed on it.
  if (process.env.npm_lifecycle_event === "axe:record") {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(found, null, 2)}\n`, "utf8");
    return;
  }
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
