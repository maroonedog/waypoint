// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
//
// One field's issues, so one PLACE. The issues a whole COLUMN carries are not
// this hook: every row's verdict is already on the form, and a summary that
// wants all of them reads `useFormStatus` rather than a wildcard here.
// ===========================================================================
import type { FormIssue } from "../contract/index.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import type { FormPath, InhabitedFormPath } from "./form-type-registry.js";

export function useFieldIssues<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>
): readonly FormIssue[];
export function useFieldIssues(spelling: string): readonly FormIssue[] {
  const { form, path } = useFormForPath(spelling);
  return useCell(form.field(path).sources.issues);
}
