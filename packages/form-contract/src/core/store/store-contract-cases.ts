// ===========================================================================
// store-contract-cases.ts — the contract as data.
//
// Separate from the runner so the cases can be counted and named by whatever
// reports them, and so adding a rule to the contract is adding one entry here
// rather than editing a function that also decides how failures are reported.
// ===========================================================================
import type { CellKey, FormCellStore } from "./form-cell-store.types.js";

export interface StoreContractCase {
  readonly what: string;
  run(store: FormCellStore, held: (holds: boolean) => void): void;
}

const A = "value:a" as CellKey<unknown>;
const B = "value:b" as CellKey<unknown>;

const countCalls = (): { calls: number; listener: () => void } => {
  const counter = { calls: 0, listener: (): void => undefined };
  counter.listener = () => {
    counter.calls += 1;
  };
  return counter;
};

export const STORE_CONTRACT_CASES: readonly StoreContractCase[] = [
  {
    what: "a read of a key never written is undefined",
    run: (store, held) => held(store.read(A) === undefined),
  },
  {
    what: "an Object.is-equal write notifies nobody",
    run: (store, held) => {
      store.write(A, 1);
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.write(A, 1);
      held(seen.calls === 0);
    },
  },
  {
    what: "a write to one key never reaches a listener on another",
    run: (store, held) => {
      const seen = countCalls();
      store.subscribe(B, seen.listener);
      store.write(A, 1);
      held(seen.calls === 0);
    },
  },
  {
    what: "notification is synchronous",
    run: (store, held) => {
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.write(A, 1);
      held(seen.calls === 1);
    },
  },
  {
    what: "batch notifies once per changed key, before it returns",
    run: (store, held) => {
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.batch(() => {
        store.write(A, 1);
        store.write(A, 2);
        held(seen.calls === 0);
      });
      held(seen.calls === 1);
    },
  },
  {
    what: "a read inside a batch sees a write made earlier in the same batch",
    run: (store, held) => {
      store.write(A, 1);
      store.batch(() => {
        store.write(A, 2);
        held(store.read(A) === 2);
      });
      held(store.read(A) === 2);
    },
  },
  {
    what: "a nested batch collapses into the outermost",
    run: (store, held) => {
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.batch(() => {
        store.batch(() => store.write(A, 1));
        held(seen.calls === 0);
      });
      held(seen.calls === 1);
    },
  },
  {
    what: "unsubscribing during notification does not skip a sibling",
    run: (store, held) => {
      const seen = countCalls();
      const stopFirst = store.subscribe(A, () => stopFirst());
      store.subscribe(A, seen.listener);
      store.write(A, 1);
      held(seen.calls === 1);
    },
  },
  {
    what: "resubscribing after unsubscribing still receives the next write",
    run: (store, held) => {
      const seen = countCalls();
      store.subscribe(A, seen.listener)();
      store.subscribe(A, seen.listener);
      store.write(A, 1);
      held(seen.calls === 1);
    },
  },
  {
    what: "forget notifies once and a later read is undefined",
    run: (store, held) => {
      store.write(A, 1);
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.forget(A);
      held(seen.calls === 1);
      held(store.read(A) === undefined);
    },
  },
  {
    // Reclamation itself is not observable through these five members: none of
    // them reports how many cells are held, and a store that answered that
    // would be reporting on its own internals. The strongest thing the surface
    // CAN see is the difference between ABSENT and PRESENT-HOLDING-UNDEFINED,
    // and that difference is exactly what a forget that reclaims produces and
    // a forget that merely blanks the slot does not. A store that parks
    // `undefined` in the key passes the case above — a later read does answer
    // undefined — and fails this one, because its equality gate now sees the
    // revival as a write of the value already there.
    what: "forget removes the key, so writing undefined into it notifies",
    run: (store, held) => {
      store.write(A, 1);
      store.forget(A);
      const seen = countCalls();
      store.subscribe(A, seen.listener);
      store.write(A, undefined);
      held(seen.calls === 1);
    },
  },
];
