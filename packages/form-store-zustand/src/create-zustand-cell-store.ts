// ===========================================================================
// create-zustand-cell-store.ts — cells held in a zustand store.
//
// It subscribes ONCE and diffs. A write made through this adapter is not the
// only way the state moves: devtools time travel, persist rehydration and the
// host application's own setState all change zustand and would otherwise
// notify nobody, leaving every snapshot stale and the DOM torn — which
// falsifies the one reason anyone wants a substitutable store.
//
// zustand has a single listener set, so per-key routing comes from the shared
// listener index. The honest price is one Object.is per OBSERVED key per
// write rather than O(1). A store that cannot route per key cannot buy that
// back.
//
// The required surface is three members, and `setState` is asked for in its
// merging form only. Demanding the replacing form as well makes the parameter
// type reject a store whose state has named members of its own, which is the
// only interesting case: a host application sharing its store with the form.
// ===========================================================================
import {
  createCellListenerIndex,
  type CellKey,
  type FormCellStore,
} from "form-core";

/** The part of a zustand store this adapter uses. */
export interface CellStateApi<TState extends object> {
  getState(): TState;
  setState(partial: Partial<TState>): void;
  subscribe(
    listener: (next: TState, previous: TState) => void
  ): () => void;
}

export function createZustandCellStore<TState extends object>(
  api: CellStateApi<TState>
): FormCellStore {
  const listeners = createCellListenerIndex();
  const state = (): Record<string, unknown> =>
    api.getState() as Record<string, unknown>;
  const put = (written: Record<string, unknown>): void => {
    api.setState(written as Partial<TState>);
  };
  let staged: Record<string, unknown> | null = null;

  api.subscribe((next, previous) => {
    const after = next as Record<string, unknown>;
    const before = previous as Record<string, unknown>;
    listeners.forEachObservedKey((key) => {
      if (!Object.is(after[key], before[key])) listeners.notify(key);
    });
  });

  return {
    read<T>(key: CellKey<T>): T | undefined {
      // Staged writes are visible to reads inside the same batch. The runtime
      // reads the root, replaces one path in it and writes it back; without
      // read-your-writes the second such pair inside one batch would start
      // from the pre-batch root and drop the first write, producing a root the
      // form never held.
      if (staged !== null && Object.prototype.hasOwnProperty.call(staged, key)) {
        return staged[key] as T | undefined;
      }
      // The state is heterogeneous; the key is what carries the type.
      return state()[key] as T | undefined;
    },
    write<T>(key: CellKey<T>, next: T): void {
      if (staged !== null) {
        staged[key] = next;
        return;
      }
      // No equality gate and no manual notify: setState notifies synchronously
      // and the diff above is the gate, so an equal write reaches nobody.
      put({ [key]: next });
    },
    forget(key) {
      // The key keeps its slot and loses its value. Removing it would need the
      // replacing form of setState, which would destroy whatever else the host
      // application keeps in this store; what a forget has to guarantee is
      // that a later read answers undefined, and this does.
      if (staged !== null) {
        staged[key] = undefined;
        return;
      }
      put({ [key]: undefined });
    },
    subscribe: (key, listener) => listeners.add(key, listener),
    batch(writes) {
      if (staged !== null) {
        writes();
        return;
      }
      staged = {};
      try {
        writes();
      } finally {
        const pending = staged;
        staged = null;
        if (Object.keys(pending).length > 0) put(pending);
      }
    },
  };
}
