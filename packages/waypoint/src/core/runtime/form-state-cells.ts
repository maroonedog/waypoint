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
//
// The count and the LIST it counts are published together, by one function, so
// that no arrangement of callers can leave them describing different passes.
// They are two cells rather than one because they change at different rates —
// see `blockingIssuesCell` — and that economy is only safe while a single
// write site owns both.
// ===========================================================================
import type { FormIssue } from "../../contract/index.js";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  blockingIssuesCell,
  errorCountCell,
  submitCountCell,
  submittingCell,
  validatingCell,
} from "../store/cell-key.js";
import { NO_ISSUES } from "./interned-defaults.js";
import { sameIssueList } from "./same-issue-list.js";

export function seedFormStateCells(store: FormCellStore): void {
  store.batch(() => {
    store.write(errorCountCell, 0);
    store.write(blockingIssuesCell, NO_ISSUES);
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
 * anybody asks it: `errorCount === 0` means the LAST PASS found nothing that
 * would stop a submit.
 *
 * "The last pass" became load-bearing when `validateOn` arrived, and the
 * sentence used to be the unconditional "submit will not be stopped". On the
 * default `"change"` a pass follows every edit and the difference is a
 * microtask wide. Under `"blur"` the count describes the form as it stood at
 * the last blur, and under `"submit"` it is 0 until the first submit — so the
 * disabled-button idiom below reports the last verdict rather than what
 * pressing the button would find. The rule that a rejected submit turns
 * change-time judging back on is what keeps that from being stale in the one
 * moment somebody is looking at it.
 *
 * A warning is NOT counted — it is still distributed to its field's issues
 * cell and still rendered, so the form shows a warning while reporting zero
 * errors, and the disabled-button idiom in `useFormStatus` keeps meaning what
 * it says. Counting warnings here would have disabled the button for an issue
 * that submit ignores, which is the worse of the two surprises.
 *
 * The list goes out beside the count, and is compared by CONTENT before it is
 * written. Every pass produces fresh issue objects, so writing unconditionally
 * would hand a new array identity to every subscriber on every keystroke —
 * which is the exact churn `sameIssueList` was written for in
 * distribute-issues.ts, arrived at from the other end. An empty verdict writes
 * the interned empty list, so a form nobody has broken never wakes a summary
 * at all.
 */
export function publishBlockingIssues(
  store: FormCellStore,
  blocking: readonly FormIssue[]
): void {
  const published = blocking.length === 0 ? NO_ISSUES : blocking;
  store.batch(() => {
    store.write(errorCountCell, published.length);
    const held = store.read(blockingIssuesCell) ?? NO_ISSUES;
    if (!sameIssueList(held, published)) {
      store.write(blockingIssuesCell, published);
    }
  });
}
