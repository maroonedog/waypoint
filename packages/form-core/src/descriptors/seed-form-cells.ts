// ===========================================================================
// seed-form-cells.ts — the cells a form starts with.
//
// Written before any component exists, which is what makes mounting a
// subscription rather than a registration. A field that is never rendered is
// still authoritative, and a list that came with rows has keys on its first
// render rather than acquiring them on its first edit.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, rowsCell, valueCell } from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import { mintRowIds, type RowIdMinter } from "../runtime/row-index.js";
import { seedFormStateCells } from "../runtime/form-state-cells.js";

export interface SeedFormCellsRequest {
  readonly store: FormCellStore;
  readonly descriptors: readonly FormFieldDescriptor[];
  readonly arrayPaths: readonly string[];
  readonly minter: RowIdMinter;
  readonly root: unknown;
}

export function seedFormCells(request: SeedFormCellsRequest): void {
  const { store, descriptors, arrayPaths, minter, root } = request;
  store.batch(() => {
    store.write(ROOT_CELL, root);
    for (const descriptor of descriptors) {
      if (descriptor.path.includes("[*]")) continue;
      store.write(valueCell(descriptor.path), readValueAt(root, descriptor.path));
    }
    for (const arrayPath of arrayPaths) {
      if (arrayPath.includes("[*]")) continue;
      const held = readValueAt(root, arrayPath);
      const length = Array.isArray(held) ? held.length : 0;
      store.write(valueCell(arrayPath), held);
      store.write(rowsCell(arrayPath), mintRowIds(minter, length));
    }
    seedFormStateCells(store);
  });
}
