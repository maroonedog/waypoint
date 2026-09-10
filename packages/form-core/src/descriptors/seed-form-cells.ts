// ===========================================================================
// seed-form-cells.ts — the cells a form starts with.
//
// Written before any component exists, which is what makes mounting a
// subscription rather than a registration. A field that is never rendered is
// still authoritative, a list that came with rows has keys on its first render
// rather than acquiring them on its first edit, and a row member paints its
// real value on its FIRST render rather than painting blank and correcting
// itself once the subscription re-derives the cell.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL } from "../store/cell-key.js";
import type { RowIdMinter } from "../runtime/row-index.js";
import { seedFormStateCells } from "../runtime/form-state-cells.js";
import { writeDeclaredCells } from "./write-declared-cells.js";

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
    writeDeclaredCells({ store, descriptors, arrayPaths, minter, root });
    seedFormStateCells(store);
  });
}
