// ===========================================================================
// create-zustand-cell-store.ts — cells held in one member of a zustand store.
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
//
// WHY the cells sit under ONE member instead of being top-level keys: `forget`
// has to REMOVE a cell, and rows churn — a data grid that adds and drops rows
// orphans every cell under the indices it dropped. Spelling forget as
// `setState({ [key]: undefined })` leaves the slot behind, so the state map
// grows without bound and the fifth store member buys nothing. Removal from a
// top-level key needs the REPLACING setState, which would destroy whatever the
// host keeps beside the cells. Owning one member escapes both: forget rebuilds
// that member without the key and merge-sets it, and nothing the host owns is
// ever read, rewritten or removed. The copy is not a new cost — zustand's
// merging setState already rebuilds the top-level object on every write, and
// that object used to hold every cell.
// ===========================================================================
import {
  createCellListenerIndex,
  type CellKey,
  type FormCellStore,
} from "../core/index.js";

/**
 * The member of the host's state that holds the cells. Prefixed and
 * punctuated so that nothing a host names for its own reasons lands on it:
 * colliding with this is something a caller has to spell out on purpose.
 */
export const FORM_CELLS_MEMBER = "waypoint:cells";

/** The part of a zustand store this adapter uses. */
export interface CellStateApi<TState extends object> {
  getState(): TState;
  setState(partial: Partial<TState>): void;
  subscribe(
    listener: (next: TState, previous: TState) => void
  ): () => void;
}

type CellSlice = Readonly<Record<string, unknown>>;

const NO_CELLS: CellSlice = Object.freeze({});

/** Staged stand-in for "this key is to be removed when the batch closes". */
const FORGOTTEN = Symbol("forgotten cell");

const holdsCell = (cells: CellSlice, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(cells, key);

export function createZustandCellStore<TState extends object>(
  api: CellStateApi<TState>
): FormCellStore {
  const listeners = createCellListenerIndex();
  const cellsOf = (state: TState): CellSlice =>
    ((state as Record<string, unknown>)[FORM_CELLS_MEMBER] as
      | CellSlice
      | undefined) ?? NO_CELLS;
  const putCells = (next: CellSlice): void => {
    const written: Record<string, unknown> = { [FORM_CELLS_MEMBER]: next };
    api.setState(written as Partial<TState>);
  };
  let staged: Map<string, unknown> | null = null;

  api.subscribe((next, previous) => {
    const after = cellsOf(next);
    const before = cellsOf(previous);
    listeners.forEachObservedKey((key) => {
      // Presence is part of what a diff has to see. "absent" and "present
      // holding undefined" are different cells — only the second is a value a
      // field holds — so a diff on values alone would call a forget of a cell
      // holding undefined, and the write that revives it, no change at all.
      if (holdsCell(after, key) !== holdsCell(before, key)) {
        listeners.notify(key);
        return;
      }
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
      if (staged !== null && staged.has(key)) {
        const pending = staged.get(key);
        return pending === FORGOTTEN ? undefined : (pending as T | undefined);
      }
      // The slice is heterogeneous; the key is what carries the type.
      return cellsOf(api.getState())[key] as T | undefined;
    },
    write<T>(key: CellKey<T>, next: T): void {
      if (staged !== null) {
        staged.set(key, next);
        return;
      }
      // No equality gate and no manual notify: setState notifies synchronously
      // and the diff above is the gate, so an equal write reaches nobody.
      putCells({ ...cellsOf(api.getState()), [key]: next });
    },
    forget(key) {
      if (staged !== null) {
        staged.set(key, FORGOTTEN);
        return;
      }
      const cells = cellsOf(api.getState());
      if (!holdsCell(cells, key)) return;
      const remaining = { ...cells };
      delete remaining[key];
      putCells(remaining);
    },
    subscribe: (key, listener) => listeners.add(key, listener),
    batch(writes) {
      if (staged !== null) {
        writes();
        return;
      }
      staged = new Map();
      try {
        writes();
      } finally {
        const pending = staged;
        staged = null;
        if (pending.size > 0) {
          // Rebuilt against the state as it is NOW, not as it was when the
          // batch opened: the host's own setState may have run inside it.
          const settled = { ...cellsOf(api.getState()) };
          for (const [key, value] of pending) {
            if (value === FORGOTTEN) delete settled[key];
            else settled[key] = value;
          }
          putCells(settled);
        }
      }
    },
  };
}
