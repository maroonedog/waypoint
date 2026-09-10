// ===========================================================================
// create-zustand-cell-store.ts — cells held in a zustand store.
//
// It subscribes ONCE and diffs. A write made through this adapter is not the
// only way the state moves: devtools time travel, persist rehydration and the
// host app's own setState all change zustand and would otherwise notify
// nobody, leaving every snapshot stale and the DOM torn — which falsifies the
// one reason anyone wants a substitutable store.
//
// zustand has a single listener set, so per-key routing comes from the shared
// listener index. The honest price is one Object.is per OBSERVED key per
// write rather than O(1). A store that cannot route per key cannot buy that
// back.
// ===========================================================================
import {
  createCellListenerIndex,
  type CellKey,
  type FormCellStore,
} from "form-core";

/** The part of a zustand vanilla store this adapter uses. */
export interface CellStateApi {
  getState(): Record<string, unknown>;
  setState(
    partial: Record<string, unknown>,
    replace?: false
  ): void;
  setState(state: Record<string, unknown>, replace: true): void;
  subscribe(
    listener: (
      next: Record<string, unknown>,
      previous: Record<string, unknown>
    ) => void
  ): () => void;
}

export function createZustandCellStore(api: CellStateApi): FormCellStore {
  const listeners = createCellListenerIndex();
  let staged: Record<string, unknown> | null = null;

  api.subscribe((next, previous) => {
    listeners.forEachObservedKey((key) => {
      if (!Object.is(next[key], previous[key])) listeners.notify(key);
    });
  });

  return {
    read<T>(key: CellKey<T>): T | undefined {
      // The state is heterogeneous; the key is what carries the type.
      return api.getState()[key] as T | undefined;
    },
    write<T>(key: CellKey<T>, next: T): void {
      if (staged !== null) {
        staged[key] = next;
        return;
      }
      // No equality gate and no manual notify: setState notifies
      // synchronously and the diff above is the gate, so an equal write
      // reaches nobody.
      api.setState({ [key]: next });
    },
    forget(key) {
      const rest = { ...api.getState() };
      delete rest[key];
      api.setState(rest, true);
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
        if (pending !== null && Object.keys(pending).length > 0) {
          api.setState(pending);
        }
      }
    },
  };
}
