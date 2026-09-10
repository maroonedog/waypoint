// ===========================================================================
// refresh-open-cells.ts — the containers and members a write moved under.
//
// A write at one path changes every container that holds it and, when the
// written value is itself a container, everything inside it. Only paths
// somebody is currently reading are rewritten: a container nobody is looking
// at costs a read per write and wakes nobody, and it is re-derived anyway the
// moment something subscribes to it.
// ===========================================================================
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { valueCell } from "../store/cell-key.js";
import { ancestorPathsOf, isAncestorPath } from "../path/path-relation.js";
import { readValueAt } from "../path/read-value-at.js";
import type { OpenValueCells } from "./open-value-cells.js";

export function refreshOpenAround(
  store: FormCellStore,
  openCells: OpenValueCells,
  root: unknown,
  path: string
): void {
  for (const ancestor of ancestorPathsOf(path)) {
    if (openCells.isOpen(ancestor)) {
      store.write(valueCell(ancestor), readValueAt(root, ancestor));
    }
  }
  openCells.forEachOpen((open) => {
    if (isAncestorPath(path, open)) {
      store.write(valueCell(open), readValueAt(root, open));
    }
  });
}
