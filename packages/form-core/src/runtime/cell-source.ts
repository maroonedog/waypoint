// ===========================================================================
// cell-source.ts — one identity-stable {subscribe, read} per key.
//
// Both members are memoised per key because useSyncExternalStore re-subscribes
// whenever `subscribe` changes identity, and re-reads whenever `read` returns
// something new. A source built per render would resubscribe every render and
// never settle.
//
// `read` applies the interned default here rather than in the caller, so every
// reader of a channel agrees on what empty looks like and the reference stays
// stable across reads.
// ===========================================================================
import type {
  CellKey,
  CellUnsubscribe,
  FormCellStore,
} from "../store/form-cell-store.types.js";

export interface CellSource<T> {
  subscribe(listener: () => void): CellUnsubscribe;
  read(): T;
}

export interface CellSourceRegistry {
  of<T>(key: CellKey<T>, whenAbsent: T): CellSource<T>;
}

export function createCellSourceRegistry(
  store: FormCellStore,
  onSubscribe?: (key: string) => CellUnsubscribe
): CellSourceRegistry {
  const sources = new Map<string, CellSource<never>>();

  return {
    of<T>(key: CellKey<T>, whenAbsent: T): CellSource<T> {
      const existing = sources.get(key);
      // The registry is heterogeneous; the key is what carries the type, and
      // a key is only ever asked for with one value type.
      if (existing !== undefined) return existing as unknown as CellSource<T>;
      const created: CellSource<T> = {
        subscribe(listener) {
          const stopObserving = onSubscribe?.(key);
          const unsubscribe = store.subscribe(key, listener);
          return () => {
            unsubscribe();
            stopObserving?.();
          };
        },
        read() {
          const held = store.read(key);
          return held === undefined ? whenAbsent : held;
        },
      };
      sources.set(key, created as unknown as CellSource<never>);
      return created;
    },
  };
}
