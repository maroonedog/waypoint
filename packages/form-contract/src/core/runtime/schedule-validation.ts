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
// AND SO DOES THE CANCELLATION, which is the one addition that could have
// broken that rule. `AbortController` is a host global too — it is in no ES
// lib, and `./core` compiles with `lib: ["ES2020"]` and `types: []` precisely
// so a claim like this is checked rather than asserted. So it is reached off
// `globalThis` the way warn-unaddressable.ts reaches `console`; it is reached
// only when the adapter asked for a signal (`cancelsSupersededPasses`, which
// create-form.ts computes from `adapter.validate.length`); and a host with no
// `AbortController` produces none and goes on working. An ordinary adapter
// costs one boolean and constructs nothing.
//
// Passes are numbered because an asynchronous verdict can arrive after a newer
// one has already been committed. A late answer describes a root that is no
// longer there, so it is dropped rather than written — otherwise typing during
// a slow check would flicker back to the verdict for what was typed before.
// The signal is that same fact told to the validator EARLY: the number stops a
// stale answer from being written, and the signal stops the round trip that
// would have produced it. A pass a signal-honouring adapter abandons rejects
// rather than resolving, which is why the coalesced path below catches — and
// is stated on `FormAdapter.validate`, because a caller who awaits
// `form.validate()` across an edit can now see that rejection.
// ===========================================================================
import {
  isPending,
  type FormIssue,
  type MaybeAsync,
  type ValidationSignal,
} from "../../contract/index.js";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { validatingCell } from "../store/cell-key.js";

/** As much of a host `AbortController` as this file uses. */
interface PassController {
  readonly signal: ValidationSignal;
  abort(): void;
}

type PassControllerMaker = new () => PassController;

/** @returns the host's `AbortController`, or nothing where there is none. */
const abortControllerFromHost = (): PassControllerMaker | undefined => {
  const found = (globalThis as { AbortController?: unknown }).AbortController;
  return typeof found === "function"
    ? (found as PassControllerMaker)
    : undefined;
};

export interface ValidationScheduler {
  /** Asks for a pass; several requests in one turn produce one pass. */
  request(): void;
  /** Judges now. Returns the verdict, or the promise of it. */
  runNow(): MaybeAsync<readonly FormIssue[]>;
}

export interface ValidationSchedulerRequest {
  readonly store: FormCellStore;
  readonly judge: (
    signal?: ValidationSignal
  ) => MaybeAsync<readonly FormIssue[]>;
  readonly commit: (produced: readonly FormIssue[]) => void;
  /**
   * True only where the adapter declared a second parameter. False costs one
   * boolean read and constructs no controller at all, which is what keeps this
   * file loadable on a host that has none.
   */
  readonly cancelsSupersededPasses: boolean;
}

export function createValidationScheduler(
  request: ValidationSchedulerRequest
): ValidationScheduler {
  const { store, judge, commit, cancelsSupersededPasses } = request;
  // Resolved once, at construction. A host does not grow an AbortController
  // halfway through a form's life, and asking per pass would put a global read
  // on every keystroke.
  const makeController = cancelsSupersededPasses
    ? abortControllerFromHost()
    : undefined;
  let inFlight: PassController | undefined;
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
    // Whatever was in flight is superseded as of this line, and saying so
    // before the new pass starts is what lets its round trip stop rather than
    // finish and be discarded.
    inFlight?.abort();
    const controller =
      makeController === undefined ? undefined : new makeController();
    inFlight = controller;
    const retireController = (): void => {
      if (inFlight === controller) inFlight = undefined;
    };

    const outcome = judge(controller?.signal);
    if (!isPending(outcome)) {
      retireController();
      commit(outcome);
      return outcome;
    }
    pending += 1;
    store.write(validatingCell, true);
    return outcome.then(
      (produced) => {
        retireController();
        if (passId === started) commit(produced);
        finishPass();
        return produced;
      },
      (reason: unknown) => {
        // A pass that threw leaves the last verdict standing rather than
        // clearing it: an error reaching the network is not evidence that the
        // form became acceptable. An abandoned pass arrives here too, and is
        // left alone for the same reason.
        retireController();
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
