// ===========================================================================
// create-form-cell-sources.ts — the sources a form hands to its readers, and
// the bookkeeping that opening one implies.
//
// Two things happen when a value cell is subscribed, and both are here because
// both are consequences of the same event.
//
// The cell is re-derived from the root first. The fan-out writes only cells
// someone is reading, so a cell that was closed while the root moved under it
// holds a value the form no longer has; painting that on remount and then
// writing it back on the next keystroke destroys the real one. It costs
// nothing when the cell was already current, because the store gates an
// Object.is-equal write.
//
// The path is then recorded as open, so the fan-out knows to keep it current
// while somebody is looking.
// ===========================================================================
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, valueCell } from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import { createCellSourceRegistry, type CellSourceRegistry } from "./cell-source.js";
import type { OpenValueCells } from "./open-value-cells.js";

const VALUE_CHANNEL_PREFIX = "value:";

export function createFormCellSources(
  store: FormCellStore,
  openCells: OpenValueCells
): CellSourceRegistry {
  return createCellSourceRegistry(store, (key) => {
    if (!key.startsWith(VALUE_CHANNEL_PREFIX)) return () => undefined;
    const path = key.slice(VALUE_CHANNEL_PREFIX.length);
    store.write(valueCell(path), readValueAt(store.read(ROOT_CELL), path));
    openCells.open(path);
    return () => openCells.close(path);
  });
}
