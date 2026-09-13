// ===========================================================================
// issue-visibility.ts — when a field starts saying what the pass already knows.
//
// TWO AXES THAT WERE ONE KNOB. `FormOptions.validateOn` decides when a PASS
// RUNS, and it is a fact about the form: one pass judges the whole root, so a
// field set to "blur" would be judged the moment any other field changed and
// there is no per-field pass to gate. That argument is sound and this file
// does not touch it.
//
// What it was silently also being asked to decide is when a FIELD REPORTS, and
// that is not a fact about the form at all. Measured on a two-field form with
// `validateOn: "blur"`: blurring `a` published `b`'s issues too, with `b`
// never touched and never typed into — so a field the reader has not reached
// was marked `aria-invalid` because a different one lost focus. The knob's
// name promised the second axis and delivered only the first.
//
// SO THE SECOND AXIS IS DECLARED WHERE IT IS TRUE: at the call. `useField` is
// the contract between a component and a form, and "does this field complain
// while I type" is the component's question about its own field. Two
// components binding the same path may honestly want different answers — a
// summary that lists everything, and an input that waits for a blur.
//
// THE PASS IS UNCHANGED, and this is the part that keeps the rest of the
// runtime honest. Nothing here delays, skips or scopes a validation; the
// verdict is computed exactly as before and `errorCount`, `blockedBy` and the
// submit gate all still count what is hidden. A field nobody can see still
// refuses the submit, which is what `useErrorSummary` is for.
//
// A REFUSED SUBMIT REVEALS EVERYTHING, whatever any field asked for. Pressing
// the button and being told nothing is the one outcome no policy may produce,
// and the same reasoning is already written into `validateOn`'s own rule about
// re-judging on change once `submitCount > 0`.
// ===========================================================================
import type { FormIssue } from "../contract/index.js";
import { NO_ISSUES } from "../core/index.js";

/**
 * When a field starts showing what the last pass found.
 *
 * `"immediately"` is the default and is what this library did before the
 * option existed. `"touched"` waits for the first blur, `"dirty"` for the
 * first edit — and both stop waiting the moment a submit has been refused.
 */
export type IssueVisibility = "immediately" | "touched" | "dirty";

export interface VisibilityInput {
  readonly visibility: IssueVisibility;
  readonly isTouched: boolean;
  readonly isDirty: boolean;
  readonly submitCount: number;
}

/** Whether this field is willing to speak yet. */
export const issuesAreVisible = (input: VisibilityInput): boolean => {
  if (input.submitCount > 0) return true;
  if (input.visibility === "immediately") return true;
  if (input.visibility === "touched") return input.isTouched;
  return input.isDirty;
};

/**
 * The list a binding publishes. Interned when empty, so a field that is not
 * speaking yet hands back the same array every render and wakes nobody.
 */
export const visibleIssues = (
  issues: readonly FormIssue[],
  input: VisibilityInput
): readonly FormIssue[] =>
  issues.length === 0 || issuesAreVisible(input) ? issues : NO_ISSUES;
