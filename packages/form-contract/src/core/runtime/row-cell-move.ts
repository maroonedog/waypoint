// ===========================================================================
// row-cell-move.ts — which cell keys a structural edit renumbers, and where to.
//
// Computed from the value as it was BEFORE the edit: a wildcard covers as many
// places as the value held then, and a row that is being removed is only
// enumerable there.
//
// A row that did not move contributes nothing. Vacating and rewriting a cell
// that is already where it belongs would notify its readers for no change.
// ===========================================================================
import { expandDeclaredPath } from "../path/expand-declared-path.js";

/** For each new row position, which old row moved into it; undefined is new. */
export type RowOrigins = readonly (number | undefined)[];

export interface RowCellMove {
  readonly source: string;
  /** Undefined when the row was removed and nothing takes its place. */
  readonly target: string | undefined;
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

export interface RowCellMovePlan {
  readonly rootBefore: unknown;
  readonly arrayPath: string;
  /** Every declared path under `arrayPath[*]`, leaves and nested arrays alike. */
  readonly declaredUnder: readonly string[];
  readonly origins: RowOrigins;
}

export function planRowCellMoves(plan: RowCellMovePlan): readonly RowCellMove[] {
  const { rootBefore, arrayPath, declaredUnder, origins } = plan;

  const destinationOf = new Map<number, number>();
  origins.forEach((origin, position) => {
    if (origin !== undefined) destinationOf.set(origin, position);
  });

  const moves: RowCellMove[] = [];
  const seen = new Set<string>();
  for (const declared of declaredUnder) {
    for (const source of expandDeclaredPath(rootBefore, declared)) {
      if (seen.has(source)) continue;
      seen.add(source);
      const row = rowIndexOf(source, arrayPath);
      if (row === undefined) continue;
      const destination = destinationOf.get(row.index);
      if (destination === row.index) continue;
      moves.push({
        source,
        target:
          destination === undefined
            ? undefined
            : `${arrayPath}[${destination}]${row.rest}`,
      });
    }
  }
  return moves;
}
