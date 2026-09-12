// ===========================================================================
// assert-design-claims.ts — the sentences in `docs/design/form-runtime.md` §3,
// turned into something that can fail.
//
// This lane exists because the largest attack on the counts lane was that it is
// structurally blind to waypoint's own per-write work. A blind spot is not
// closed by printing a new integer: it is closed by printing an integer that
// somebody could have got wrong and did not. So nothing is reported until three
// things hold.
//
// ONE, the open set reads the same from the store's live subscriptions and from
// the runtime's own isOpen branch. These share no code; if the harness's idea of
// which cells are open had drifted from the runtime's, the scan length printed
// below would be a number about the harness.
//
// TWO, the value cells the write actually refreshed are exactly the open
// ancestors and open descendants of the written path. This is what makes the
// scan length a measurement rather than a derivation: a scan that iterated a
// different set would refresh a different set, and the store saw which.
//
// THREE, design §3's "work is O(cells that changed), not O(mounted fields)" —
// every write is the same three cells (root, the value, the dirty flag) plus
// exactly one per cell the scan found. That claim is TRUE and stays true here.
// It is also not the whole story, which is the point of the lane: the SCAN is
// O(mounted fields) even where the WRITES are not, and the two numbers sit in
// the same row of the report so neither can be quoted without the other.
// ===========================================================================
import { dirtyCell, valueCell, ROOT_CELL } from "@maroonedog/waypoint/core";
import { refreshesProducedBy, type ScanShape } from "./count-open-cell-scan.ts";

export interface DesignClaimsRequest {
  readonly shapeId: string;
  readonly writtenPath: string;
  readonly bySubscription: readonly string[];
  readonly byReadBranch: readonly string[];
  readonly scan: ScanShape;
  /** Every key the store was asked to write during the `setValue`, in order. */
  readonly writtenKeys: readonly string[];
}

const sorted = (paths: readonly string[]): string => [...paths].sort().join("\n");

export function assertDesignClaims(request: DesignClaimsRequest): void {
  const { shapeId, writtenPath, bySubscription, byReadBranch, scan, writtenKeys } =
    request;
  const where = `${shapeId} / ${writtenPath}`;

  if (sorted(bySubscription) !== sorted(byReadBranch)) {
    throw new Error(
      `${where}: the open value cells read differently from the store's live ` +
        `subscriptions (${bySubscription.length}) than from the runtime's own ` +
        `isOpen branch (${byReadBranch.length}). One of the two is no longer ` +
        `the open set, so no scan length may be published.`
    );
  }

  const expectedRefreshes = [
    ...scan.openAncestors,
    ...scan.openDescendants,
  ].map(valueCell);
  const actualRefreshes = writtenKeys.filter(
    (key) => key !== valueCell(writtenPath) && key.startsWith("value:")
  );
  if (sorted(expectedRefreshes) !== sorted(actualRefreshes)) {
    throw new Error(
      `${where}: the write refreshed ${actualRefreshes.length} value cells, ` +
        `but the open set says the scan should have found ` +
        `${expectedRefreshes.length}. refresh-open-cells.ts no longer scans ` +
        `what this lane thinks it scans.`
    );
  }

  const expectedWrites = 3 + refreshesProducedBy(scan);
  if (writtenKeys.length !== expectedWrites) {
    throw new Error(
      `${where}: the write touched ${writtenKeys.length} cells, not the ` +
        `${expectedWrites} that design §3 implies — the root, the value, the ` +
        `dirty flag and one per open cell the scan found. Writes seen: ` +
        `${writtenKeys.join(", ")}.`
    );
  }
  for (const required of [ROOT_CELL, valueCell(writtenPath), dirtyCell(writtenPath)]) {
    if (!writtenKeys.includes(required)) {
      throw new Error(`${where}: the write never touched ${required}.`);
    }
  }
}
