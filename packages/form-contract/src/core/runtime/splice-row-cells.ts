// ===========================================================================
// splice-row-cells.ts — moves the cells a structural edit renumbers.
//
// Cell keys carry the concrete index, so removing row 1 of five means every
// cell under rows 2 to 4 now belongs to rows 1 to 3.
//
// EVERY channel travels, not only the ones a value repairs. A value cell is
// re-derived when it is subscribed, so leaving it behind is survivable; the
// touched and dirty flags, the issue list, the participation mark and a nested
// list's row ORDER live nowhere else, and a survivor left holding the removed
// row's participation mark is silently exempt from blocking a submit.
//
// Everything is READ first and written afterwards. A move is a permutation,
// and writing as it is computed lets a later row overwrite a cell an earlier
// one has not been read from yet.
//
// The value is taken from the pre-edit ROOT rather than from the cell, because
// a cell nobody ever subscribed to holds nothing while the root holds the
// value — reading the cell would carry undefined over a live neighbour.
// ===========================================================================
import type { FormIssue } from "../../contract/index.js";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  dirtyCell,
  issuesCell,
  participatingCell,
  rowsCell,
  touchedCell,
  valueCell,
} from "../store/cell-key.js";
import { readValueAt } from "../path/read-value-at.js";
import {
  planRowCellMoves,
  type RowCellMove,
  type RowOrigins,
} from "./row-cell-move.js";

export type { RowOrigins, RowCellMove };

export interface SpliceRowCellsRequest {
  readonly store: FormCellStore;
  readonly arrayPath: string;
  /** Every declared path under `arrayPath[*]`, leaves and nested arrays alike. */
  readonly declaredUnder: readonly string[];
  readonly rootBefore: unknown;
  readonly origins: RowOrigins;
}

interface HeldCell {
  readonly target: string;
  readonly value: unknown;
  readonly issues: readonly FormIssue[] | undefined;
  readonly touched: boolean | undefined;
  readonly dirty: boolean | undefined;
  readonly participating: boolean | undefined;
  readonly rows: readonly string[] | undefined;
}

/** @returns the moves, so a caller holding paths outside the store can follow. */
export function spliceRowCells(
  request: SpliceRowCellsRequest
): readonly RowCellMove[] {
  const { store, arrayPath, declaredUnder, rootBefore, origins } = request;
  const moves = planRowCellMoves({
    rootBefore,
    arrayPath,
    declaredUnder,
    origins,
  });

  const carried: HeldCell[] = [];
  for (const move of moves) {
    if (move.target === undefined) continue;
    carried.push({
      target: move.target,
      value: readValueAt(rootBefore, move.source),
      issues: store.read(issuesCell(move.source)),
      touched: store.read(touchedCell(move.source)),
      dirty: store.read(dirtyCell(move.source)),
      participating: store.read(participatingCell(move.source)),
      rows: store.read(rowsCell(move.source)),
    });
  }

  store.batch(() => {
    for (const move of moves) {
      store.forget(valueCell(move.source));
      store.forget(issuesCell(move.source));
      store.forget(touchedCell(move.source));
      store.forget(dirtyCell(move.source));
      store.forget(participatingCell(move.source));
      store.forget(rowsCell(move.source));
    }
    // Only what the source actually held is carried. Writing an absent flag
    // would turn "never touched" into a cell holding undefined.
    for (const held of carried) {
      store.write(valueCell(held.target), held.value);
      if (held.issues !== undefined) {
        // The issue is addressed at the path it belongs to, so moving the cell
        // without re-addressing the issue would leave the two disagreeing and
        // make the next pass rewrite what it had just been handed.
        store.write(
          issuesCell(held.target),
          held.issues.map((issue) => ({ ...issue, path: held.target }))
        );
      }
      if (held.touched !== undefined) {
        store.write(touchedCell(held.target), held.touched);
      }
      if (held.dirty !== undefined) {
        store.write(dirtyCell(held.target), held.dirty);
      }
      if (held.participating !== undefined) {
        store.write(participatingCell(held.target), held.participating);
      }
      if (held.rows !== undefined) {
        store.write(rowsCell(held.target), held.rows);
      }
    }
  });
  return moves;
}
