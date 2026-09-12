// ===========================================================================
// fan-out-write.ts — one leaf edit, everything it actually changes.
//
// The root is rewritten because a validator is handed a whole root, and the
// leaf cell because that is what the input reads. Containers are written only
// when something is reading them; a leaf edit with no container on screen
// touches three cells.
//
// All of it inside one batch, so the listeners fire once each after the last
// write rather than once per write.
// ===========================================================================
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, dirtyCell, valueCell } from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import { writeValueAt } from "../path/write-value-at.js";
import type { OpenValueCells } from "./open-value-cells.js";
import { refreshOpenAround } from "./refresh-open-cells.js";

export interface FanOutWriteRequest {
  readonly store: FormCellStore;
  readonly openCells: OpenValueCells;
  readonly initialRoot: unknown;
  readonly path: string;
  readonly next: unknown;
}

export function fanOutWrite(request: FanOutWriteRequest): void {
  const { store, openCells, initialRoot, path, next } = request;
  store.batch(() => {
    const root = writeValueAt(store.read(ROOT_CELL), path, next);
    store.write(ROOT_CELL, root);
    store.write(valueCell(path), next);
    store.write(dirtyCell(path), !Object.is(readValueAt(initialRoot, path), next));
    refreshOpenAround(store, openCells, root, path);
  });
}
