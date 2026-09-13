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
//
// IT IS GATED BY `messageFor`, and that is the same line drawn the other way.
// Visibility is per control; WORDING is per application, and two wordings for
// one issue on one screen — a field saying the application's sentence and the
// summary beside it saying the validator's — is the defect. So every hook that
// hands out a message applies it, this one included.
// ===========================================================================
import { useContext } from "react";
import type { FormIssue } from "../contract/index.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import { wordedIssues } from "./form-message.js";
import { FormMessageContext } from "./form-message-context.js";
import type { FormPath, InhabitedFormPath } from "../contract/index.js";

export function useFieldIssues<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>
): readonly FormIssue[];
export function useFieldIssues(spelling: string): readonly FormIssue[] {
  const { form, path } = useFormForPath(spelling);
  const handle = form.field(path);
  const messageFor = useContext(FormMessageContext);
  return wordedIssues(
    useCell(handle.sources.issues),
    messageFor,
    handle.descriptor
  );
}
