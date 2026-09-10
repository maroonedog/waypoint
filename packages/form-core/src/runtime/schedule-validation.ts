// ===========================================================================
// schedule-validation.ts — one pass per settled change, not one per write.
//
// A single user action is many writes, and each of them would otherwise judge
// the whole root. Coalescing to a microtask means the pass runs once, after
// the event handler has finished and before the browser paints.
//
// The microtask is taken from a resolved promise rather than from
// queueMicrotask, which is a host global. This package is meant to run
// wherever a validator does, so it depends on the language and not on an
// environment.
//
// The pass is counted so a result can be compared against what has already
// been committed. Nothing asynchronous produces a verdict yet, so no result is
// discarded today; the counter is what a later async pass compares itself to.
// ===========================================================================
import type { FormIssue } from "form-contract";

export interface ValidationScheduler {
  /** Asks for a pass; several requests in one turn produce one pass. */
  request(): void;
  /** Judges now, writes the verdict, and returns it. */
  runNow(): readonly FormIssue[];
}

export function createValidationScheduler(
  judge: () => readonly FormIssue[]
): ValidationScheduler {
  let scheduled = false;
  let passId = 0;

  const runNow = (): readonly FormIssue[] => {
    passId += 1;
    return judge();
  };

  return {
    request() {
      if (scheduled) return;
      scheduled = true;
      void Promise.resolve().then(() => {
        scheduled = false;
        runNow();
      });
    },
    runNow,
  };
}
