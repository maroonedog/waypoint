// Coalesce requested scopes and accept only the newest validation verdict.
// Unfinished scopes survive supersession and failures so a later partial pass
// cannot silently drop work. Whole-root requests dominate partial requests.
// AbortController is optional: the core can run without browser libraries.
import {
  isPending,
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

export interface ValidationScheduler<T> {
  /** Asks for a pass; several requests in one turn produce one pass. */
  request(paths?: readonly string[]): void;
  /** Judges now. Returns the verdict, or the promise of it. */
  runNow(paths?: readonly string[]): MaybeAsync<T>;
}

export interface ValidationSchedulerRequest<T> {
  readonly store: FormCellStore;
  readonly judge: (
    signal?: ValidationSignal,
    paths?: readonly string[]
  ) => MaybeAsync<T>;
  readonly commit: (produced: T) => void;
  /**
   * True when a validation method declares a signal parameter. False costs one
   * boolean read and constructs no controller at all, which is what keeps this
   * file loadable on a host that has none.
   */
  readonly cancelsSupersededPasses: boolean;
}

export function createValidationScheduler<T>(
  request: ValidationSchedulerRequest<T>
): ValidationScheduler<T> {
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
  const outstanding = new Set<string>();
  let wholeRoot = false;
  const include = (paths?: readonly string[]): void => {
    if (paths === undefined) wholeRoot = true;
    else for (const path of paths) outstanding.add(path);
  };
  const accept = (produced: T): void => {
    outstanding.clear();
    wholeRoot = false;
    commit(produced);
  };

  const finishPass = (): void => {
    pending -= 1;
    if (pending === 0) store.write(validatingCell, false);
  };

  const runAccumulated = (): MaybeAsync<T> => {
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

    // Keep unfinished scopes until a successful commit. A superseding partial
    // pass must also judge work whose previous answer will now be discarded.
    let outcome: MaybeAsync<T>;
    try {
      outcome = judge(controller?.signal, wholeRoot ? undefined : [...outstanding]);
    } catch (reason) {
      retireController();
      throw reason;
    }
    if (!isPending(outcome)) {
      retireController();
      if (passId === started) accept(outcome);
      return outcome;
    }
    pending += 1;
    store.write(validatingCell, true);
    return outcome.then(
      (produced) => {
        retireController();
        try {
          if (passId === started) accept(produced);
        } finally {
          finishPass();
        }
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
    request(paths) {
      include(paths);
      started += 1;
      if (scheduled) return;
      scheduled = true;
      void Promise.resolve().then(() => {
        if (!scheduled) return;
        scheduled = false;
        const outcome = runAccumulated();
        // A coalesced pass has no caller to hand a rejection to.
        if (isPending(outcome)) void outcome.catch(() => undefined);
      }).catch(() => undefined);
    },
    runNow(paths) {
      include(paths);
      scheduled = false;
      return runAccumulated();
    },
  };
}
