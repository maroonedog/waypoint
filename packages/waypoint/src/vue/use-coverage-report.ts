// ===========================================================================
// use-coverage-report.ts — the question asked once, when the subtree is up.
//
// Vue runs every child's `setup()` before any `onMounted`, and fires
// `onMounted` child-first with the enclosing component's last, so by the time
// this one runs every binding rendered in that pass has already reported
// itself. Measured on a provider over three levels: setup ran
// provider, a, middle, deep, b — and then mounted ran a, deep, middle, b,
// provider. That ordering is the whole reason this can be a single mounted
// hook with no timer and no polling, and it is the same ordering React's
// effects give, which is why the two reports say the same thing.
//
// AND IT IS THE LIMIT OF THE ANSWER, said plainly rather than discovered. A
// field that arrives later — an async `setup()` under `<Suspense>`, a
// `defineAsyncComponent`, a section behind a toggle nobody has opened — has
// not arrived, and this reports it. The runtime cannot tell "not yet" from
// "never". A screen that draws part of a form on purpose says so with
// `partial`, and `form.coverage.missing()` stays available to ask again later.
//
// `"throw"` DOES NOT REACH A CALLER THE WAY IT DOES IN REACT, and that is a
// fact about Vue rather than a choice made here. Measured, three mounts of one
// component that throws from `onMounted`: with nothing installed, the error
// escaped `mount()`; with `app.config.errorHandler` set, nothing escaped and
// the handler received it with the info string "mounted hook"; with an
// ancestor's `onErrorCaptured` returning false, nothing escaped and the
// ancestor received it. So under Vue, `onFieldMismatch: "throw"` means "raise
// it through whatever error channel this application installed", not "stop the
// mount" — and the second of those three is what a production application
// has. The message is the same either way.
//
// ONCE PER FORM WHEN IT WARNS, tracked by the handle's own identity, so a
// second provider over the same form does not repeat it. A THROW is not
// tracked: a warning repeated is noise, and an error raised again is the same
// thing still being true.
// ===========================================================================
import { onMounted } from "vue";
import type { FormHandle } from "../core/index.js";
import { warnOnHostConsole } from "../core/index.js";
import { describeMissingFields } from "../dom/describe-missing-fields.js";

const alreadyWarned = new WeakSet<object>();

export function useCoverageReport(
  form: FormHandle<unknown, string>,
  formKey: string | undefined,
  partial: boolean
): void {
  const reaction = form.onFieldMismatch;
  onMounted(() => {
    if (partial || reaction === "ignore") return;
    const missing = form.coverage.missing();
    if (missing.length === 0) return;
    const message = describeMissingFields(missing, formKey);
    if (reaction === "throw") throw new Error(message);
    if (alreadyWarned.has(form)) return;
    alreadyWarned.add(form);
    warnOnHostConsole(message);
  });
}
