// ===========================================================================
// write-declared-cells.ts — every cell a root implies, written from that root.
//
// Declared paths are EXPANDED before they are written, so a member of a row
// and a list nested inside a row both get their cells. A wildcard covers as
// many places as the value holds, and only the value knows how many that is.
//
// The rows channel is the reason this cannot skip wildcard paths the way an
// earlier version did. A value cell is re-derived when it is subscribed, so
// missing one is repaired on the first render; nothing re-derives a row order,
// so a list whose order was never written renders no rows at all and only a
// reset makes it appear.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { rowsCell, valueCell } from "../store/cell-key.js";
import { expandDeclaredPath } from "../path/expand-declared-path.js";
import { readValueAt } from "../path/read-value-at.js";
import { mintRowIds, type RowIdMinter } from "../runtime/row-index.js";

export interface WriteDeclaredCellsRequest {
  readonly store: FormCellStore;
  readonly descriptors: readonly FormFieldDescriptor[];
  /** Declared array paths, outermost first. */
  readonly arrayPaths: readonly string[];
  readonly minter: RowIdMinter;
  readonly root: unknown;
}

export function writeDeclaredCells(request: WriteDeclaredCellsRequest): void {
  const { store, descriptors, arrayPaths, minter, root } = request;
  store.batch(() => {
    for (const descriptor of descriptors) {
      for (const path of expandDeclaredPath(root, descriptor.path)) {
        store.write(valueCell(path), readValueAt(root, path));
      }
    }
    // Outermost first, so a row of the outer list is numbered before the list
    // inside it — which is what makes the ids readable when they are compared.
    for (const arrayPath of arrayPaths) {
      for (const path of expandDeclaredPath(root, arrayPath)) {
        const held = readValueAt(root, path);
        store.write(valueCell(path), held);
        store.write(
          rowsCell(path),
          mintRowIds(minter, Array.isArray(held) ? held.length : 0)
        );
      }
    }
  });
}
