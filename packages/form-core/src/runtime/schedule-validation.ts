// ===========================================================================
// schedule-validation.ts — one pass per settled change, and only the newest
// answer counts.
//
// A single user action is many writes, and each of them would otherwise judge
// the whole root. Coalescing to a microtask means the pass runs once, after
// the event handler has finished and before the browser paints.
//
// The microtask is taken from a resolved promise rather than from
// queueMicrotask, which is a host global. This package runs wherever a
// validator does, so it depends on the language and not on an environment.
//
// Passes are numbered because an asynchronous verdict can arrive after a newer
// one has already been committed. A late answer describes a root that is no
// longer there, so it is dropped rather than written — otherwise typing during
// a slow check would flicker back to the verdict for what was typed before.
// ===========================================================================
import { isPending, type FormIssue, type MaybeAsync } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { validatingCell } from "../store/cell-key.js";

export interface ValidationScheduler {
  /** Asks for a pass; several requests in one turn produce one pass. */
  request(): void;
  /** Judges now. Returns the verdict, or the promise of it. */
  runNow(): MaybeAsync<readonly FormIssue[]>;
}

export interface ValidationSchedulerRequest {
  readonly store: FormCellStore;
  readonly judge: () => MaybeAsync<readonly FormIssue[]>;
  readonly commit: (produced: readonly FormIssue[]) => void;
}

export function createValidationScheduler(
  request: ValidationSchedulerRequest
): ValidationScheduler {
  const { store, judge, commit } = request;
  let scheduled = false;
  let started = 0;
  let pending = 0;

  const finishPass = (): void => {
    pending -= 1;
    if (pending === 0) store.write(validatingCell, false);
  };

  const runNow = (): MaybeAsync<readonly FormIssue[]> => {
    started += 1;
    const passId = started;
    const outcome = judge();
    if (!isPending(outcome)) {
      commit(outcome);
      return outcome;
    }
    pending += 1;
    store.write(validatingCell, true);
    return outcome.then(
      (produced) => {
        if (passId === started) commit(produced);
        finishPass();
        return produced;
      },
      (reason: unknown) => {
        // A pass that threw leaves the last verdict standing rather than
        // clearing it: an error reaching the network is not evidence that the
        // form became acceptable.
        finishPass();
        throw reason;
      }
    );
  };

  return {
    request() {
      if (scheduled) return;
      scheduled = true;
      void Promise.resolve().then(() => {
        scheduled = false;
        const outcome = runNow();
        // A coalesced pass has no caller to hand a rejection to.
        if (isPending(outcome)) void outcome.catch(() => undefined);
      });
    },
    runNow,
  };
}
