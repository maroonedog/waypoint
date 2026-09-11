// ===========================================================================
// submit-form.ts — one attempt to hand the form over.
//
// It judges the whole root first, so a field nobody has mounted is judged too:
// a form that submits because the offending input was off screen is the defect
// this exists to prevent.
//
// What blocks is reported, not just counted. `blockedBy` carries every issue
// including ones on paths with no component, so the caller can open the right
// section rather than showing a disabled button with no explanation.
//
// The handler runs only when nothing blocks, and a handler that throws leaves
// the form not submitted rather than half submitted.
// ===========================================================================
import type { FormIssue, MaybeAsync } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  submitCountCell,
  submittingCell,
} from "../store/cell-key.js";

export interface SubmitOutcome {
  readonly submitted: boolean;
  /** Empty when the form was handed over. */
  readonly blockedBy: readonly FormIssue[];
}

export type SubmitHandler = (root: unknown) => void | Promise<void>;

export interface SubmitFormRequest {
  readonly store: FormCellStore;
  readonly judgeNow: () => MaybeAsync<readonly FormIssue[]>;
  readonly blockingOf: (produced: readonly FormIssue[]) => readonly FormIssue[];
  readonly handler: SubmitHandler;
}

export async function submitForm(
  request: SubmitFormRequest
): Promise<SubmitOutcome> {
  const { store, judgeNow, blockingOf, handler } = request;
  store.write(submittingCell, true);
  try {
    const blockedBy = blockingOf(await judgeNow());
    if (blockedBy.length > 0) return { submitted: false, blockedBy };
    await handler(store.read(ROOT_CELL));
    return { submitted: true, blockedBy: [] };
  } finally {
    store.batch(() => {
      store.write(submittingCell, false);
      store.write(submitCountCell, (store.read(submitCountCell) ?? 0) + 1);
    });
  }
}
