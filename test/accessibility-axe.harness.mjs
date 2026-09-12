// The document, the caller's markup, and the runner — everything an axe run
// needs except the cases.
//
// WHY ALL THREE ARE IN ONE FILE AND NONE OF THEM IS IN THE TEST FILE. There
// are exactly two ways to turn a failing accessibility run green without
// fixing anything, and both of them look like fixing the test. One is to edit
// the markup until the rule stops matching. The other is to narrow what the
// run measures — drop a tag, disable a rule, re-record the list. Those are the
// three things this file holds, and holding them TOGETHER and away from the
// cases is the point: either edit is then a change to a harness that a
// reviewer reads as one, rather than a line added next to the test that went
// red. A suite whose subject is markup cannot keep its markup where the
// pressure to adjust it is.
//
// It serves accessibility-axe.test.mjs and nothing else, which is why it is
// named after that file and sits beside it rather than in test/support/ —
// that directory is for modules more than one test file imports.
//
// THE MARKUP IS THE CALLER'S, and moving it here is what makes that legible.
// Defined in the test file it reads as the markup the test needed; defined
// here, beside nothing, it reads as what it is — a label, a control, a help
// line, a message, deliberately ordinary, because the four prop bags are the
// thing under test and the claim is that ORDINARY markup spread with them
// comes out right. It is the caller's markup in the same sense the README's
// examples are. This library authors no widget, and the split between a
// `<select>` for a closed field and a bare `<input>` for everything else is
// written out longhand below for that reason: the test must not pretend a
// widget exists.
//
// THE RUN RECORDS WHICH RULES DECIDED, not just whether it found anything. A
// run that finds nothing is two different results wearing one face: the markup
// is clean, or the rule never fired. jsdom has no layout, so `color-contrast`
// reaches no verdict here however good or bad the colours are, and a suite
// reporting "0 violations" would be claiming a check it did not perform. So
// `audit` accumulates the rules that reached a verdict and the rules that
// could not into `seen`, and the last case compares both against
// config/axe-coverage.json. A rule going quiet — an axe upgrade, a markup
// change that stops matching — fails the build the way a new violation does.
//
// NOTHING ABOUT THE DOCUMENT BELOW IS LOAD-BEARING, which is worth stating
// because it reads as though it must be. `auditOf` calls `axe.run(container)`,
// scoped to the mounted subtree, so no rule that decides about the PAGE can
// reach this suite at all — `html-has-lang`, `document-title` and `region` are
// missing from `decided` in config/axe-coverage.json for that reason and not
// because the markup satisfied them. Measured three ways — stripping the
// `lang`, the `<title>` and the `<main>`; dropping the five globals here that
// support/dom.mjs does not install; replacing this whole block with an import
// of support/dom.mjs — each left all five tests passing with the recorded rule
// lists unchanged. The only thing the run needs here is an element to mount in.
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

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { FieldRows, FormProvider, useErrorSummary, useField } = await import(
  "@maroonedog/waypoint/react"
);

export const axe = (await import("axe-core")).default;

const { act, createElement: h, Fragment } = React;

const BASELINE_PATH = fileURLToPath(
  new URL("../config/axe-coverage.json", import.meta.url)
);
export const BASELINE = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

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

/** A flat form: every path in `paths`, one after the other. */
export const fieldsScreen = (form, paths) =>
  h(
    FormProvider,
    { form },
    h("form", { noValidate: true }, h(Fields, { paths }))
  );

/** A growable list: one fieldset per row, each with a remove button. */
export const rowsScreen = (form, path) =>
  h(
    FormProvider,
    { form },
    h(
      "form",
      { noValidate: true },
      h(FieldRows, { path }, ({ rows, remove }) =>
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
  );

/**
 * The error summary: `scopeProps` and `summaryProps` spread onto the markup
 * they imply — a heading, a list, a button per entry. No document in this
 * repository shows a caller this markup, so it is written out rather than cited.
 */
export const errorSummaryScreen = (form, paths) => {
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
      h(Fields, { paths })
    );
  }
  return h(FormProvider, { form }, h(Screen));
};

// ---------------------------------------------------------------------------
// Describing a field without a schema, for the cases that want an exact shape.
// ---------------------------------------------------------------------------

export const descriptor = (path, kind, extra = {}) => ({
  path,
  kind,
  isRequired: false,
  constraints: {},
  label: path,
  ...extra,
});

export const staticAdapter = (fields, issues = []) => ({
  fields,
  validate: () => issues,
});

/** One field per member of `FormFieldKind`, all eight of them. */
export const EVERY_KIND = [
  "string",
  "number",
  "boolean",
  "date",
  "file",
  "array",
  "object",
  "unknown",
].map((kind) => descriptor(kind, kind));

// ---------------------------------------------------------------------------
// Running one case.
// ---------------------------------------------------------------------------

const TAGS = BASELINE.tags;

export const sorted = (values) => [...new Set(values)].sort();

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
export const seen = { decided: [], undecided: [] };

export async function audit(name, element) {
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

/**
 * Re-recording is `npm run axe:record`, and it is deliberately a different
 * command from the one that fails: a list that rewrites itself when it
 * disagrees is not a gate. What it writes still has to be read.
 *
 * The switch is npm's own `npm_lifecycle_event` rather than an environment
 * variable set in the script, because `FOO=1 node …` is not a command on
 * Windows and this repository is developed on it.
 *
 * @returns whether the record was rewritten, in which case nothing is gated.
 */
export function writeRecordWhenAsked(found) {
  if (process.env.npm_lifecycle_event !== "axe:record") return false;
  writeFileSync(BASELINE_PATH, `${JSON.stringify(found, null, 2)}\n`, "utf8");
  return true;
}

export { act };
