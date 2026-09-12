// ===========================================================================
// form-state-cells.ts — the aggregates, one cell each.
//
// One cell per number rather than one object holding all of them. A reader
// that built the object would return a fresh value on every call, and a
// snapshot that is never the same twice is what React reports as
// "The result of getSnapshot should be cached" before it loops.
//
// The count of blocking issues is not the count of issues: a dormant subtree
// still produces issues and they do not block, and neither does an issue a
// vendor marked as a warning.
// ===========================================================================
import type { FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  errorCountCell,
  submitCountCell,
  submittingCell,
  validatingCell,
} from "../store/cell-key.js";

export function seedFormStateCells(store: FormCellStore): void {
  store.batch(() => {
    store.write(errorCountCell, 0);
    store.write(submittingCell, false);
    store.write(submitCountCell, 0);
    store.write(validatingCell, false);
  });
}

/**
 * A warning is advice, not a verdict. Only `severity: "warning"` steps aside;
 * an ABSENT severity blocks, because a vendor that omits the field has not
 * said "warning" — it has said nothing, and the vendors that ship today
 * (zod has no warning level at all) omit it on every issue they produce.
 * Reading absence as permission would unblock every form in existence.
 */
const stopsSubmit = (issue: FormIssue): boolean => issue.severity !== "warning";

/** The issues that stop a submit: what a participating path reported as error. */
export function blockingIssues(
  produced: readonly FormIssue[],
  isParticipating: (path: string) => boolean
): readonly FormIssue[] {
  return produced.filter(
    (issue) => stopsSubmit(issue) && isParticipating(issue.path)
  );
}

/**
 * `errorCount` counts what blocks, so it stays the answer to the only question
 * anybody asks it: `errorCount === 0` means submit will not be stopped. A
 * warning is therefore NOT counted — it is still distributed to its field's
 * issues cell and still rendered, so the form shows a warning while reporting
 * zero errors, and the disabled-button idiom in `useFormStatus` keeps meaning
 * what it says. Counting warnings here would have disabled the button for an
 * issue that submit ignores, which is the worse of the two surprises.
 */
export function writeErrorCount(
  store: FormCellStore,
  blocking: readonly FormIssue[]
): void {
  store.write(errorCountCell, blocking.length);
}
