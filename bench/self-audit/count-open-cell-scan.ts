// ===========================================================================
// count-open-cell-scan.ts — how long the per-write scan is, taken twice.
//
// `refresh-open-cells.ts` runs two loops on every write. The first walks the
// written path's ancestors and asks `isOpen` about each; the second asks
// `forEachOpen` for EVERY open value cell and runs `isAncestorPath` against it.
// The second loop is the one the design document worries about, and its length
// is the number of open value cells — nothing else.
//
// The open set is therefore the whole measurement, and it is taken two ways
// that share no code. One reads the store's live `value:` subscriptions, which
// `create-form-cell-sources.ts` opens and closes in the same closure. The other
// asks the RUNTIME, through a branch it already has: a value source reads
// `store.read(valueCell(path))` when the path is open and
// `readValueAt(store.read(ROOT_CELL), path)` when it is not, so which key the
// store was asked for is `openCells.isOpen(path)` answered by the shipped code
// rather than reconstructed by this harness.
//
// Neither is trusted alone. assert-design-claims.ts requires them to agree, and
// then requires the cells the write actually refreshed to be exactly the ones
// the scan shape below predicts — which is what turns a derived integer into a
// measured one.
// ===========================================================================
import {
  ancestorPathsOf,
  isAncestorPath,
  valueCell,
  ROOT_CELL,
  type FormHandle,
} from "@maroonedog/form-contract/core";
import type { CountingCellStore } from "./counting-cell-store.ts";

/** Open value paths, as the runtime's own read branch answers for them. */
export function openPathsByReadBranch(
  counting: CountingCellStore,
  form: FormHandle<unknown, string>,
  candidates: readonly string[]
): readonly string[] {
  const open: string[] = [];
  for (const path of candidates) {
    counting.tally.readKeys.length = 0;
    form.field(path).sources.value.read();
    const asked = counting.tally.readKeys;
    if (asked.includes(valueCell(path))) open.push(path);
    else if (!asked.includes(ROOT_CELL)) {
      throw new Error(
        `The value source for "${path}" read neither its own cell nor the ` +
          `root; create-form-cell-sources.ts no longer branches on isOpen, so ` +
          `this lane can no longer take the open set from it.`
      );
    }
  }
  return open;
}

export interface ScanShape {
  readonly openValueCells: number;
  /** `isAncestorPath` calls, and the length of the array allocated to make them. */
  readonly openCellScanLength: number;
  /** `isOpen` lookups the ancestor loop makes. */
  readonly ancestorProbes: number;
  readonly openAncestors: readonly string[];
  readonly openDescendants: readonly string[];
}

/** What a write at `path` will scan, and what it will find, given the open set. */
export function scanShapeOf(
  open: readonly string[],
  path: string
): ScanShape {
  const openSet = new Set(open);
  return {
    openValueCells: open.length,
    openCellScanLength: open.length,
    ancestorProbes: ancestorPathsOf(path).length,
    openAncestors: ancestorPathsOf(path).filter((one) => openSet.has(one)),
    openDescendants: open.filter((one) => isAncestorPath(path, one)),
  };
}

export const refreshesProducedBy = (shape: ScanShape): number =>
  shape.openAncestors.length + shape.openDescendants.length;
