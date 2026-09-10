// ===========================================================================
// create-cell-store.ts — the shipped store: a Map over the listener index.
//
// It is the default and not a privilege. Everything it does is stated in the
// contract, and an adapter that passes the conformance kit replaces it whole.
//
// `cells.has` is checked before the equality gate so that the FIRST write of a
// value equal to undefined still notifies: "never written" and "written as
// undefined" are different, and only the second one is a value a field holds.
// ===========================================================================
import type {
  CellKey,
  FormCellStore,
} from "./form-cell-store.types.js";
import { createCellListenerIndex } from "./cell-listener-index.js";

export function createCellStore(
  seed?: ReadonlyMap<string, unknown>
): FormCellStore {
  const cells = new Map<string, unknown>(seed);
  const listeners = createCellListenerIndex();
  const changed = new Set<string>();
  let depth = 0;

  const settle = (key: string): void => {
    if (depth === 0) {
      listeners.notify(key);
      return;
    }
    changed.add(key);
  };

  return {
    read<T>(key: CellKey<T>): T | undefined {
      // The map is heterogeneous by design; the key is what carries the type.
      return cells.get(key) as T | undefined;
    },
    write<T>(key: CellKey<T>, next: T): void {
      if (cells.has(key) && Object.is(cells.get(key), next)) return;
      cells.set(key, next);
      settle(key);
    },
    forget(key) {
      if (!cells.delete(key)) return;
      settle(key);
    },
    subscribe: (key, listener) => listeners.add(key, listener),
    batch(writes) {
      depth += 1;
      try {
        writes();
      } finally {
        depth -= 1;
        if (depth === 0) {
          const flushing = Array.from(changed);
          changed.clear();
          for (const key of flushing) listeners.notify(key);
        }
      }
    },
  };
}
