// ===========================================================================
// use-coverage-report.ts — the question asked once, when the subtree is up.
//
// A provider's effect runs after its children's, so by the time this one fires
// every binding rendered in that commit has already reported itself — the
// bindings report while they render, which is earlier still. That ordering is
// the whole reason this can be a single effect with no timer and no polling.
//
// AND IT IS THE LIMIT OF THE ANSWER, said plainly rather than discovered. A
// field that arrives later — a lazy chunk, a suspended boundary, a section
// behind a toggle nobody has opened — has not arrived, and this reports it.
// The runtime cannot tell "not yet" from "never", and a check that waited for
// "never" would run at a moment that does not exist. A screen that draws part
// of a form on purpose says so with `partial`, which is a fact about the
// SCREEN and therefore a prop rather than a setting on the form; and
// `form.coverage.missing()` stays available to ask again at any later moment.
//
// ONCE PER FORM WHEN IT WARNS, tracked by the handle's own identity, so React
// mounting a subtree twice in development says it once and a second provider
// over the same form does not repeat it. A THROW is not tracked: a warning
// repeated is noise, and an error raised again is the same thing still being
// true. Nothing has to be cleared between tests because a test that builds a
// new form has built a new identity.
// ===========================================================================
import { useEffect } from "react";
import type { FormHandle } from "../core/index.js";
import { warnOnHostConsole } from "../core/index.js";
import { describeMissingFields } from "./describe-missing-fields.js";

const alreadyWarned = new WeakSet<object>();

export function useCoverageReport(
  form: FormHandle<unknown, string>,
  formKey: string | undefined,
  partial: boolean
): void {
  const reaction = form.onFieldMismatch;
  useEffect(() => {
    if (partial || reaction === "ignore") return;
    const missing = form.coverage.missing();
    if (missing.length === 0) return;
    const message = describeMissingFields(missing, formKey);
    if (reaction === "throw") throw new Error(message);
    if (alreadyWarned.has(form)) return;
    alreadyWarned.add(form);
    warnOnHostConsole(message);
  }, [form, formKey, reaction, partial]);
}
