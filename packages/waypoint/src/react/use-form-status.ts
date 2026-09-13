// ===========================================================================
// use-form-status.ts — the aggregates, read one cell at a time.
//
// Four subscriptions composed in the component body, not one bundled reader.
// A reader that built this object would return a fresh value on every call,
// which React reports as "The result of getSnapshot should be cached" and then
// loops on. Composing here happens after the snapshot comparison, not during
// it, so a fresh object is harmless.
//
// A KEY AND NOT A PATH, which is why qualifying paths did nothing for this
// hook. A status is an aggregate over the whole form — there is no path in the
// call to carry a form's name — so it took no argument at all and a named
// form's status was unreachable from a component that wanted to say which form
// it meant. The key it now takes is checked against the enclosing provider's
// the way every other named call is.
// ===========================================================================
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type { FormKey } from "./waypoint-forms.js";

export interface FormStatus {
  /** Issues that currently block a submit; a dormant subtree is excluded. */
  readonly errorCount: number;
  readonly isSubmitting: boolean;
  readonly submitCount: number;
  readonly isValidating: boolean;
}

export function useFormStatus(formKey?: FormKey): FormStatus {
  const form = useFormHandle(formKey);
  return {
    errorCount: useCell(form.errorCount),
    isSubmitting: useCell(form.submitting),
    submitCount: useCell(form.submitCount),
    isValidating: useCell(form.validating),
  };
}
