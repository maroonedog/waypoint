// ===========================================================================
// count-fiber-visits.ts — how much of the tree React did work on.
//
// WHAT THIS IS, EXACTLY: the fibers present in one commit that were not
// present in the commit before it. React creates a new fiber object for a
// position it works on and reuses the existing one when it bails out, so the
// difference between two consecutive snapshots is the work — taken by object
// identity, not by inspecting props.
//
// WHAT IT IS NOT: a render count from a Profiler. A production build never
// calls one, and switching to a development build to get a prettier number
// would be measuring a React nobody ships.
//
// Every comparison is against the IMMEDIATELY preceding commit. React keeps
// two fiber objects per position and alternates between them, so a snapshot
// two commits old reports a legitimately reused object as new work — and,
// worse, a tree that has swapped back reports no work at all while the DOM
// plainly moved.
// ===========================================================================
import type { CommitSnapshot } from "./install-devtools-hook.ts";

export interface FiberVisitCount {
  /** Every fiber in the committed tree. */
  readonly treeFibers: number;
  /** Those React created for this commit, which is the work it did. */
  readonly changedFibers: number;
  /** Of those, the ones that are host nodes. */
  readonly changedHostFibers: number;
}

export function countFiberVisits(
  commit: CommitSnapshot,
  before: CommitSnapshot
): FiberVisitCount {
  let changedFibers = 0;
  let changedHostFibers = 0;
  for (const fiber of commit.fibers) {
    if (before.fibers.has(fiber)) continue;
    changedFibers += 1;
    if (commit.hostFibers.has(fiber)) changedHostFibers += 1;
  }
  return { treeFibers: commit.fibers.size, changedFibers, changedHostFibers };
}

/** Adds the work across commits; the tree size is the largest seen. */
export const sumFiberVisits = (
  counts: readonly FiberVisitCount[]
): FiberVisitCount =>
  counts.reduce<FiberVisitCount>(
    (total, one) => ({
      treeFibers: Math.max(total.treeFibers, one.treeFibers),
      changedFibers: total.changedFibers + one.changedFibers,
      changedHostFibers: total.changedHostFibers + one.changedHostFibers,
    }),
    { treeFibers: 0, changedFibers: 0, changedHostFibers: 0 }
  );

export const EMPTY_COMMIT: CommitSnapshot = {
  fibers: new Set(),
  hostFibers: new Set(),
};
