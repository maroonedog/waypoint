// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
// ===========================================================================
import type { FormIssue } from "form-contract";
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";

export function useFieldIssues(path: string): readonly FormIssue[] {
  const form = useForm();
  return useCell(form.field(path).sources.issues);
}
