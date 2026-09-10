// ===========================================================================
// form-state-cells.ts — the aggregates, one cell each.
//
// One cell per number rather than one object holding all of them. A reader
// that built the object would return a fresh value on every call, and a
// snapshot that is never the same twice is what React reports as
// "The result of getSnapshot should be cached" before it loops.
//
// The count of blocking issues is not the count of issues: a dormant subtree
// still produces issues and they do not block.
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

/** The issues that stop a submit: everything a participating path reported. */
export function blockingIssues(
  produced: readonly FormIssue[],
  isParticipating: (path: string) => boolean
): readonly FormIssue[] {
  return produced.filter((issue) => isParticipating(issue.path));
}

export function writeErrorCount(
  store: FormCellStore,
  blocking: readonly FormIssue[]
): void {
  store.write(errorCountCell, blocking.length);
}
