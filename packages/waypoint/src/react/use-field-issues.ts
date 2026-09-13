// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
//
// One field's issues, so one PLACE. The issues a whole COLUMN carries are not
// this hook: every row's verdict is already on the form, and a summary that
// wants all of them reads `useErrorSummary` rather than a wildcard here.
//
// IT IS NOT GATED BY `showIssues`, and that is the difference worth knowing
// about. The visibility policy lives in the BINDINGS, because it answers "is
// this input ready to complain to the person typing in it" — a question about
// one control. This hook has no control: it is read by a summary, a badge, a
// step indicator, and those have to say what is true whatever any input has
// decided to keep to itself. So on a screen set to `"touched"`, `useField`
// stays quiet and this reports, which is the same asymmetry `errorCount` and
// `blockedBy` already have.
// ===========================================================================
import type { FormIssue } from "../contract/index.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import type { FormPath, InhabitedFormPath } from "./waypoint-forms.js";

export function useFieldIssues<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>
): readonly FormIssue[];
export function useFieldIssues(spelling: string): readonly FormIssue[] {
  const { form, path } = useFormForPath(spelling);
  return useCell(form.field(path).sources.issues);
}
