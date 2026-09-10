// ===========================================================================
// reset-form.ts — the form, as it was made.
//
// Every cell the old value reached is forgotten before the new one is seeded.
// Writing the new values over the old cells would leave behind whatever the
// old value had that the new one does not — a row that no longer exists, a
// touched flag on a field that was cleared — and those are exactly the cells
// nothing else would ever correct.
//
// The paths to forget are expanded over the OLD root, because that is the only
// place a row that is about to disappear is still enumerable.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  dirtyCell,
  issuesCell,
  rowsCell,
  touchedCell,
  valueCell,
} from "../store/cell-key.js";
import { expandDeclaredPath } from "../path/expand-declared-path.js";
import { readValueAt } from "../path/read-value-at.js";
import type { RowIdMinter } from "./row-index.js";
import { mintRowIds } from "./row-index.js";

export interface ResetFormRequest {
  readonly store: FormCellStore;
  readonly descriptors: readonly FormFieldDescriptor[];
  readonly arrayPaths: readonly string[];
  readonly minter: RowIdMinter;
  readonly nextRoot: unknown;
}

export function resetForm(request: ResetFormRequest): void {
  const { store, descriptors, arrayPaths, minter, nextRoot } = request;
  const rootBefore = store.read(ROOT_CELL);

  store.batch(() => {
    for (const descriptor of descriptors) {
      for (const path of expandDeclaredPath(rootBefore, descriptor.path)) {
        store.forget(valueCell(path));
        store.forget(issuesCell(path));
        store.forget(touchedCell(path));
        store.forget(dirtyCell(path));
      }
    }
    for (const arrayPath of arrayPaths) {
      for (const path of expandDeclaredPath(rootBefore, arrayPath)) {
        store.forget(valueCell(path));
        store.forget(rowsCell(path));
      }
    }

    store.write(ROOT_CELL, nextRoot);

    for (const descriptor of descriptors) {
      for (const path of expandDeclaredPath(nextRoot, descriptor.path)) {
        store.write(valueCell(path), readValueAt(nextRoot, path));
      }
    }
    for (const arrayPath of arrayPaths) {
      for (const path of expandDeclaredPath(nextRoot, arrayPath)) {
        const held = readValueAt(nextRoot, path);
        const length = Array.isArray(held) ? held.length : 0;
        store.write(valueCell(path), held);
        store.write(rowsCell(path), mintRowIds(minter, length));
      }
    }
  });
}
