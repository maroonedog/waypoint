// ===========================================================================
// use-form-status.ts — the aggregates, read one cell at a time.
//
// Four subscriptions, composed as getters rather than as one bundled reader,
// so a button disabled on `errorCount` is not woken by a submit starting.
//
// A KEY AND NOT A PATH: a status is an aggregate over the whole form, so there
// is no path in the call for a form's name to travel inside. The key it takes
// is compared against the enclosing provider's the way every other named call
// is.
// ===========================================================================
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type { FormKey } from "../contract/index.js";

export interface FormStatus {
  /** Issues that currently block a submit; a dormant subtree is excluded. */
  readonly errorCount: number;
  readonly isSubmitting: boolean;
  readonly submitCount: number;
  readonly isValidating: boolean;
}

export function useFormStatus(formKey?: FormKey): FormStatus {
  const form = useFormHandle(formKey);
  const errorCount = useCell(form.errorCount);
  const isSubmitting = useCell(form.submitting);
  const submitCount = useCell(form.submitCount);
  const isValidating = useCell(form.validating);
  return {
    get errorCount() {
      return errorCount.value;
    },
    get isSubmitting() {
      return isSubmitting.value;
    },
    get submitCount() {
      return submitCount.value;
    },
    get isValidating() {
      return isValidating.value;
    },
  };
}
