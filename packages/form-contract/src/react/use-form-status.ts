// ===========================================================================
// use-form-status.ts — the aggregates, read one cell at a time.
//
// Four subscriptions composed in the component body, not one bundled reader.
// A reader that built this object would return a fresh value on every call,
// which React reports as "The result of getSnapshot should be cached" and then
// loops on. Composing here happens after the snapshot comparison, not during
// it, so a fresh object is harmless.
// ===========================================================================
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";

export interface FormStatus {
  /** Issues that currently block a submit; a dormant subtree is excluded. */
  readonly errorCount: number;
  readonly isSubmitting: boolean;
  readonly submitCount: number;
  readonly isValidating: boolean;
}

export function useFormStatus(): FormStatus {
  const form = useForm();
  return {
    errorCount: useCell(form.errorCount),
    isSubmitting: useCell(form.submitting),
    submitCount: useCell(form.submitCount),
    isValidating: useCell(form.validating),
  };
}
