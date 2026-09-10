// ===========================================================================
// create-rows-handle.ts — the three structural edits of one array.
//
// The row ORDER is a cell of opaque ids, separate from the array value. A
// component reading the order is woken when rows are added, removed or moved
// and is left alone while a member of a row is edited, because those are
// different cells.
//
// Each edit is one batch: the root, the order and every renumbered cell settle
// together, so nothing observes a list whose value and order disagree.
// ===========================================================================
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, rowsCell, valueCell } from "../store/cell-key.js";
import type { CellSource, CellSourceRegistry } from "./cell-source.js";
import { readValueAt } from "../path/read-value-at.js";
import { writeValueAt } from "../path/write-value-at.js";
import type { RowIdMinter } from "./row-index.js";
import { spliceRowCells, type RowOrigins } from "./splice-row-cells.js";
import { NO_ROWS } from "./interned-defaults.js";

export interface RowsHandle {
  readonly path: string;
  /** The ids, in order. A row id is a React key and never an address. */
  readonly ids: CellSource<readonly string[]>;
  insert(at: number, value?: unknown): void;
  remove(at: number): void;
  move(from: number, to: number): void;
}

export interface RowsHandleRequest {
  readonly store: FormCellStore;
  readonly sources: CellSourceRegistry;
  readonly arrayPath: string;
  readonly members: readonly string[];
  readonly minter: RowIdMinter;
  readonly requestValidation: () => void;
}

const clamp = (at: number, length: number): number =>
  at < 0 ? 0 : at > length ? length : at;

export function createRowsHandle(request: RowsHandleRequest): RowsHandle {
  const { store, sources, arrayPath, members, minter, requestValidation } =
    request;

  const readIds = (): readonly string[] =>
    store.read(rowsCell(arrayPath)) ?? NO_ROWS;

  const readRows = (root: unknown): readonly unknown[] => {
    const held = readValueAt(root, arrayPath);
    return Array.isArray(held) ? held : [];
  };

  const commit = (
    nextRows: readonly unknown[],
    nextIds: readonly string[],
    origins: RowOrigins
  ): void => {
    const rootBefore = store.read(ROOT_CELL);
    store.batch(() => {
      const root = writeValueAt(rootBefore, arrayPath, nextRows);
      store.write(ROOT_CELL, root);
      store.write(valueCell(arrayPath), nextRows);
      store.write(rowsCell(arrayPath), nextIds);
      spliceRowCells({ store, arrayPath, members, rootBefore, origins });
    });
    requestValidation();
  };

  return {
    path: arrayPath,
    ids: sources.of(rowsCell(arrayPath), NO_ROWS),

    insert(at, value) {
      const rows = readRows(store.read(ROOT_CELL));
      const ids = readIds();
      const where = clamp(at, rows.length);
      commit(
        [...rows.slice(0, where), value, ...rows.slice(where)],
        [...ids.slice(0, where), minter.next(), ...ids.slice(where)],
        [
          ...rows.slice(0, where).map((_row, index) => index),
          undefined,
          ...rows.slice(where).map((_row, index) => where + index),
        ]
      );
    },

    remove(at) {
      const rows = readRows(store.read(ROOT_CELL));
      const ids = readIds();
      if (at < 0 || at >= rows.length) return;
      commit(
        [...rows.slice(0, at), ...rows.slice(at + 1)],
        [...ids.slice(0, at), ...ids.slice(at + 1)],
        [
          ...rows.slice(0, at).map((_row, index) => index),
          ...rows.slice(at + 1).map((_row, index) => at + 1 + index),
        ]
      );
    },

    move(from, to) {
      const rows = readRows(store.read(ROOT_CELL));
      const ids = readIds();
      if (from < 0 || from >= rows.length) return;
      const where = clamp(to, rows.length - 1);
      if (where === from) return;

      const order = rows.map((_row, index) => index);
      const [moved] = order.splice(from, 1);
      if (moved === undefined) return;
      order.splice(where, 0, moved);

      commit(
        order.map((index) => rows[index]),
        order.map((index) => ids[index] ?? minter.next()),
        order
      );
    },
  };
}
