// ===========================================================================
// cell-listener-index.ts — per-key listener sets.
//
// Supplied to adapters whose backing store has one global listener list. A
// store that already routes per key does not need this.
//
// notify iterates a COPY. A listener that unsubscribes during notification
// mutates the set it is being iterated from, and a live iterator would skip
// the sibling that followed it — a stale component with no symptom.
// ===========================================================================
import type {
  CellKey,
  CellListener,
  CellUnsubscribe,
} from "./form-cell-store.types.js";

export interface CellListenerIndex {
  add(key: CellKey<unknown>, listener: CellListener): CellUnsubscribe;
  notify(key: string): void;
  /** Every key with at least one listener, for adapters that must diff. */
  forEachObservedKey(visit: (key: string) => void): void;
}

export function createCellListenerIndex(): CellListenerIndex {
  const byKey = new Map<string, Set<CellListener>>();

  return {
    add(key, listener) {
      let listeners = byKey.get(key);
      if (listeners === undefined) {
        listeners = new Set();
        byKey.set(key, listeners);
      }
      listeners.add(listener);
      return () => {
        const current = byKey.get(key);
        if (current === undefined) return;
        current.delete(listener);
        if (current.size === 0) byKey.delete(key);
      };
    },
    notify(key) {
      const listeners = byKey.get(key);
      if (listeners === undefined) return;
      for (const listener of Array.from(listeners)) listener();
    },
    forEachObservedKey(visit) {
      for (const key of Array.from(byKey.keys())) visit(key);
    },
  };
}
