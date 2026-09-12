// ===========================================================================
// create-form-cell-sources.ts — the sources a form hands to its readers, and
// the bookkeeping that opening one implies.
//
// The fan-out writes only the value cells somebody is reading, because a leaf
// edit changes the leaf, the root and every container between them, and
// writing all of those every keystroke would wake nobody most of the time.
// Everything here follows from that one economy.
//
// SUBSCRIBING re-derives the cell from the root first. A cell that was closed
// while the root moved under it holds a value the form no longer has; painting
// that on remount and then writing it back on the next keystroke destroys the
// real one. It costs nothing when the cell was already current, because the
// store gates an Object.is-equal write. The path is then recorded as open, so
// the fan-out knows to keep it current while somebody is looking.
//
// READING does not wait for any of that. A closed cell is not maintained, so
// asking the store for one answers with whatever was left there — stale, or
// absent for a path nobody has ever opened. React never saw it, because
// useSyncExternalStore subscribes and then re-reads; a plain subscriber doing
// the obvious thing — read now, subscribe for later — got the wrong value and
// nothing said so. So a closed value cell reads from the root, which is always
// current, and an open one stays a map lookup: the path React takes every
// keystroke is unchanged, and subscribing is once again only about being told.
// ===========================================================================
import type { CellKey, FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, valueCell } from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import { createCellSourceRegistry, type CellSourceRegistry } from "./cell-source.js";
import type { OpenValueCells } from "./open-value-cells.js";

const VALUE_CHANNEL_PREFIX = "value:";

/** The path a value key names, or undefined when the key is another channel. */
const valuePathOf = (key: string): string | undefined =>
  key.startsWith(VALUE_CHANNEL_PREFIX)
    ? key.slice(VALUE_CHANNEL_PREFIX.length)
    : undefined;

export function createFormCellSources(
  store: FormCellStore,
  openCells: OpenValueCells
): CellSourceRegistry {
  return createCellSourceRegistry(
    store,
    (key) => {
      const path = valuePathOf(key);
      if (path === undefined) return () => undefined;
      store.write(valueCell(path), readValueAt(store.read(ROOT_CELL), path));
      openCells.open(path);
      return () => openCells.close(path);
    },
    (key) => {
      const path = valuePathOf(key);
      if (path === undefined || openCells.isOpen(path)) {
        return store.read(key as CellKey<unknown>);
      }
      return readValueAt(store.read(ROOT_CELL), path);
    }
  );
}
