// ===========================================================================
// self-audit.types.ts — the rows this lane records, and nothing else.
//
// The counts lane compares five libraries; this one compares form-contract to
// its own design document, so there is no competitor column and no agreement
// cell. What is left is a handful of integers per size, and they are separated
// into three rows because they answer three different accusations: what a
// MOUNT costs, what a WRITE costs, and what a VALIDATION PASS costs.
//
// Everything here is an integer that does not depend on the machine, which is
// the only reason this lane can be gated. The one figure that does depend on
// the machine — how long the scan actually takes — lives in a separate type in
// measure-scan-cost.ts, and is printed rather than recorded.
// ===========================================================================

/** What `createForm` wrote before any component existed. */
export interface MountRow {
  readonly shapeId: string;
  readonly leaves: number;
  /** Store writes inside `createForm`. Design §5 calls this O(N), never 0. */
  readonly cellsSeededAtMount: number;
  /** Of those, the ones on the `value:` channel. */
  readonly valueCellsSeeded: number;
  readonly storeReadsAtMount: number;
}

/** One `setValue`, with a stated number of value cells open. */
export interface WriteRow {
  readonly shapeId: string;
  readonly leaves: number;
  readonly scenarioId: string;
  readonly writtenPath: string;
  /** Value cells with a live reader when the write happened. */
  readonly openValueCells: number;
  /**
   * `isAncestorPath` calls the write made, and the length of the array
   * `forEachOpen` allocated to make them. The number Tier 1 cannot see.
   */
  readonly openCellScanLength: number;
  /** `isOpen` lookups the ancestor loop made — one per path segment above. */
  readonly ancestorProbes: number;
  /** Open cells the scan found and rewrote. The scan's entire output. */
  readonly valueCellsRefreshed: number;
  readonly storeWrites: number;
  readonly storeReads: number;
  readonly notificationsDelivered: number;
}

/** One whole-root validation pass over a root with one leaf broken. */
export interface PassRow {
  readonly shapeId: string;
  readonly leaves: number;
  /** Issues the adapter handed back. */
  readonly issuesProduced: number;
  /** Issue cells `distribute-issues.ts` wrote, which is what wakes a field. */
  readonly issueCellsWritten: number;
  readonly notificationsDelivered: number;
}

export interface SelfAuditRun {
  readonly mount: MountRow;
  readonly writes: readonly WriteRow[];
  readonly pass: PassRow;
}
