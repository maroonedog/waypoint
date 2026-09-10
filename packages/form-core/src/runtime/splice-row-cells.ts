// ===========================================================================
// splice-row-cells.ts — moves the cells a structural edit renumbers.
//
// Cell keys carry the concrete index, so removing row 1 of five means every
// cell under rows 2 to 4 now belongs to rows 1 to 3. The value would repair
// itself on the next subscription, but the touched and dirty flags and the
// issue list would not: they live nowhere else.
//
// Everything is READ first and written afterwards. A move is a permutation,
// and writing as it is computed lets a later row overwrite a cell an earlier
// one has not been read from yet.
//
// The paths to move come from the value as it was BEFORE the edit, because a
// wildcard covers as many places as the value held then. Reading them from the
// new root would miss the row that was removed.
// ===========================================================================
import type { FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  dirtyCell,
  issuesCell,
  touchedCell,
  valueCell,
} from "../store/cell-key.js";
import { expandDeclaredPath } from "../path/expand-declared-path.js";

/** For each new row position, which old row moved into it; undefined is new. */
export type RowOrigins = readonly (number | undefined)[];

export interface SpliceRowCellsRequest {
  readonly store: FormCellStore;
  readonly arrayPath: string;
  /** The declared paths that live under `arrayPath[*]`. */
  readonly members: readonly string[];
  readonly rootBefore: unknown;
  readonly origins: RowOrigins;
}

const rowIndexOf = (
  concretePath: string,
  arrayPath: string
): { readonly index: number; readonly rest: string } | undefined => {
  const opens = `${arrayPath}[`;
  if (!concretePath.startsWith(opens)) return undefined;
  const closes = concretePath.indexOf("]", opens.length);
  if (closes === -1) return undefined;
  const index = Number(concretePath.slice(opens.length, closes));
  return Number.isInteger(index)
    ? { index, rest: concretePath.slice(closes + 1) }
    : undefined;
};

const atRow = (arrayPath: string, index: number, rest: string): string =>
  `${arrayPath}[${index}]${rest}`;

interface HeldCell {
  readonly target: string;
  readonly value: unknown;
  readonly issues: readonly FormIssue[] | undefined;
  readonly touched: boolean | undefined;
  readonly dirty: boolean | undefined;
}

export function spliceRowCells(request: SpliceRowCellsRequest): void {
  const { store, arrayPath, members, rootBefore, origins } = request;

  const destinationOf = new Map<number, number>();
  origins.forEach((origin, position) => {
    if (origin !== undefined) destinationOf.set(origin, position);
  });

  const carried: HeldCell[] = [];
  const vacated: string[] = [];

  for (const member of members) {
    for (const source of expandDeclaredPath(rootBefore, member)) {
      const row = rowIndexOf(source, arrayPath);
      if (row === undefined) continue;
      const destination = destinationOf.get(row.index);
      if (destination === row.index) continue;
      if (destination !== undefined) {
        carried.push({
          target: atRow(arrayPath, destination, row.rest),
          value: store.read(valueCell(source)),
          issues: store.read(issuesCell(source)),
          touched: store.read(touchedCell(source)),
          dirty: store.read(dirtyCell(source)),
        });
      }
      vacated.push(source);
    }
  }

  store.batch(() => {
    // Vacate first: a source that nothing moved into must not keep a cell, and
    // a source that something DID move into is written back below.
    for (const source of vacated) {
      store.forget(valueCell(source));
      store.forget(issuesCell(source));
      store.forget(touchedCell(source));
      store.forget(dirtyCell(source));
    }
    // Only what the source actually held is carried. Writing an absent flag
    // would turn "never touched" into a cell holding undefined, which is a
    // cell nobody needs and one more thing to reclaim later.
    for (const held of carried) {
      store.write(valueCell(held.target), held.value);
      if (held.issues !== undefined) {
        store.write(issuesCell(held.target), held.issues);
      }
      if (held.touched !== undefined) {
        store.write(touchedCell(held.target), held.touched);
      }
      if (held.dirty !== undefined) {
        store.write(dirtyCell(held.target), held.dirty);
      }
    }
  });
}
