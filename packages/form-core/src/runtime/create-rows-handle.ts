// ===========================================================================
// create-rows-handle.ts — the three structural edits of one array.
//
// The row ORDER is a cell of opaque ids, separate from the array value. A
// component reading the order is woken when rows are added, removed or moved
// and is left alone while a member of a row is edited, because those are
// different cells.
//
// Each edit is one batch: the root, the order, every renumbered cell and every
// container somebody is reading settle together, so nothing observes a list
// whose value and order disagree.
//
// An index is truncated to an integer before anything is computed from it. A
// fractional or NaN index would match no row, which makes every row look
// removed and destroys the whole list's flags and issues.
// ===========================================================================
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, rowsCell, valueCell } from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import { writeValueAt } from "../path/write-value-at.js";
import type { CellSource, CellSourceRegistry } from "./cell-source.js";
import type { OpenValueCells } from "./open-value-cells.js";
import { refreshOpenAround } from "./refresh-open-cells.js";
import type { RowIdMinter } from "./row-index.js";
import { spliceRowCells } from "./splice-row-cells.js";
import type { RowCellMove, RowOrigins } from "./row-cell-move.js";
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
  readonly openCells: OpenValueCells;
  readonly arrayPath: string;
  /** Every declared path under `arrayPath[*]`, leaves and nested arrays alike. */
  readonly declaredUnder: readonly string[];
  readonly minter: RowIdMinter;
  readonly requestValidation: () => void;
  /** Told where the cells went, for whoever holds paths outside the store. */
  readonly onCellsMoved: (moves: readonly RowCellMove[]) => void;
}

const asIndex = (at: number): number =>
  Number.isFinite(at) ? Math.trunc(at) : 0;

const clamp = (at: number, length: number): number => {
  const whole = asIndex(at);
  return whole < 0 ? 0 : whole > length ? length : whole;
};

export function createRowsHandle(request: RowsHandleRequest): RowsHandle {
  const {
    store,
    sources,
    openCells,
    arrayPath,
    declaredUnder,
    minter,
    requestValidation,
    onCellsMoved,
  } = request;

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
    let moves: readonly RowCellMove[] = [];
    store.batch(() => {
      const root = writeValueAt(rootBefore, arrayPath, nextRows);
      store.write(ROOT_CELL, root);
      store.write(valueCell(arrayPath), nextRows);
      store.write(rowsCell(arrayPath), nextIds);
      moves = spliceRowCells({
        store,
        arrayPath,
        declaredUnder,
        rootBefore,
        origins,
      });
      refreshOpenAround(store, openCells, root, arrayPath);
    });
    onCellsMoved(moves);
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
      const where = asIndex(at);
      if (where < 0 || where >= rows.length) return;
      commit(
        [...rows.slice(0, where), ...rows.slice(where + 1)],
        [...ids.slice(0, where), ...ids.slice(where + 1)],
        [
          ...rows.slice(0, where).map((_row, index) => index),
          ...rows.slice(where + 1).map((_row, index) => where + 1 + index),
        ]
      );
    },

    move(from, to) {
      const rows = readRows(store.read(ROOT_CELL));
      const ids = readIds();
      const start = asIndex(from);
      if (start < 0 || start >= rows.length) return;
      const where = clamp(to, rows.length - 1);
      if (where === start) return;

      const order = rows.map((_row, index) => index);
      const [moved] = order.splice(start, 1);
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
