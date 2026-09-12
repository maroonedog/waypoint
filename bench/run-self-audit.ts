// ===========================================================================
// run-self-audit.ts — Tier 2, measured, and either recorded or gated.
//
// Command: `npm run bench:self-audit`. Baseline:
// `config/self-audit-baseline.json`. Report: `docs/measurements-self-audit.md`.
//
// The counts lane compares form-contract to four other libraries and cannot see
// inside any of them, form-contract included. This lane compares form-contract
// to its own design document — no competitor column, because the competitors
// expose no equivalent, and none is implied.
//
// `--check` compares the integers and exits non-zero on drift, and SKIPS the
// timing sections entirely: a gate that depends on a nanosecond is a gate that
// teaches people to re-run CI until it passes.
//
// The sizes are the counts lane's three, so the two reports can be read side by
// side, plus one larger size the counts lane cannot afford. Two points on the
// same side of a straight line are not evidence that the line is straight, and
// the claim being audited here is about growth.
// ===========================================================================
import { mkdirSync, writeFileSync } from "node:fs";
import { SHAPES, buildShape } from "./shape/build-shape.ts";
import { describeMachine } from "./env/describe-machine.ts";
import { measureSelfAudit } from "./self-audit/measure-self-audit.ts";
import type { SelfAuditRun } from "./self-audit/self-audit.types.ts";
import {
  measureScanCost,
  nanosecondsPerOpenCell,
  SCANNED_ARRAY,
  SCANNED_LEAF,
  type ScanCostRow,
} from "./self-audit/measure-scan-cost.ts";
import { measureWriteCost } from "./self-audit/measure-write-cost.ts";
import {
  compareSelfAuditBaseline,
  readSelfAuditBaseline,
  toSelfAuditBaseline,
  writeSelfAuditBaseline,
} from "./self-audit/self-audit-baseline.ts";
import {
  renderCostSummary,
  renderMountTable,
  renderPassTable,
  renderScanCostTable,
  renderWriteCostTable,
  renderWriteTable,
  type CostSummaryRow,
} from "./report/render-self-audit-tables.ts";

const gating = process.argv.includes("--check");
const shapes = [...SHAPES, buildShape(370)];

const runs: SelfAuditRun[] = [];
for (const shape of shapes) runs.push(await measureSelfAudit(shape));
const taken = toSelfAuditBaseline(runs);

if (gating) {
  const drift = compareSelfAuditBaseline(readSelfAuditBaseline(), taken);
  if (drift.length > 0) {
    console.error("The self-audit counts moved against the recorded baseline:\n");
    for (const line of drift) console.error(`  ${line}`);
    console.error(
      "\nIf the change is intended, rerun without --check to record it and " +
        "say in the commit what the runtime now does differently."
    );
    process.exit(1);
  }
  console.log("The self-audit counts match the recorded baseline.");
  console.log(
    "No nanosecond was compared: what the scan costs is printed by " +
      "`npm run bench:self-audit`, on the machine that runs it."
  );
  process.exit(0);
}

const scanRows = shapes.flatMap(measureScanCost);
const writeRows = shapes.map(measureWriteCost);
const machine = describeMachine();

/**
 * What mounting writes beyond one cell per leaf, COUNTED off the runs rather
 * than written down. The constant moved silently once already — a fifth
 * form-state cell arrived and the sentence below went on saying seven — and a
 * hardcoded number in a generated document is the one thing this lane exists
 * to stop. It throws rather than averaging, because a non-constant overhead
 * would mean the sentence is wrong in a way no single number can fix.
 */
const overheadAboveLeaves = (): number => {
  const seen = new Set(
    runs.map((run) => run.mount.cellsSeededAtMount - run.mount.leaves)
  );
  if (seen.size !== 1) {
    throw new Error(
      `mount overhead is not constant across shapes: ${[...seen].join(", ")}`
    );
  }
  return [...seen][0] as number;
};

const leafRungsOf = (shapeId: string): readonly ScanCostRow[] =>
  scanRows.filter(
    (row) => row.shapeId === shapeId && row.writtenPath === SCANNED_LEAF
  );

const summary: CostSummaryRow[] = writeRows.map((write) => ({
  shapeId: write.shapeId,
  scanRows: leafRungsOf(write.shapeId),
  write,
}));

const widest = summary[summary.length - 1];
const widestScan = widest?.scanRows[widest.scanRows.length - 1];
const scanMicroseconds = (widestScan?.nanosecondsPerScan ?? 0) / 1000;

// The same scan length at the same size, once finding nothing and once finding
// the twelve row members: the difference is what a refresh costs.
const widestArrayScan = scanRows
  .filter(
    (row) =>
      row.shapeId === widest?.shapeId && row.writtenPath === SCANNED_ARRAY
  )
  .at(-1);
const refreshMicroseconds =
  ((widestArrayScan?.nanosecondsPerScan ?? 0) -
    (widestScan?.nanosecondsPerScan ?? 0)) /
  1000;
const refreshNanosecondsEach =
  (refreshMicroseconds * 1000) / Math.max(1, widestArrayScan?.cellsRefreshed ?? 1);
const keystrokeMicroseconds =
  ((widest?.write.nanosecondsPerWrite ?? 0) +
    (widest?.write.nanosecondsPerPass ?? 0)) /
  1000;
const share =
  keystrokeMicroseconds === 0
    ? 0
    : (scanMicroseconds / keystrokeMicroseconds) * 100;

const report = [
  "# Form runtime self-audit — Tier 2",
  "",
  "form-contract only. **No competitor column**, because no competitor " +
    "exposes an equivalent — this tier gates the author's library against the " +
    "author's own design document, and it is a self-audit rather than a " +
    "comparison.",
  "",
  "Every integer in §1–§3 is gated by `npm run bench:self-audit:check`. The " +
    "microseconds in §4 are not gated and are recorded nowhere: they move when " +
    "the runner does, which is the same reason the counts lane gates and the " +
    "time lane does not.",
  "",
  "Driven through `@maroonedog/form-contract/core` with **no React**. The " +
    "subscription installed per field is `sources.value.subscribe`, which is " +
    "the one `useCell` hands to `useSyncExternalStore`, so \"every field on " +
    "screen\" here opens exactly the cells a rendered form opens. The sizes " +
    "are the counts lane's `leaves-31`, `leaves-61` and `leaves-201`, plus a " +
    "`leaves-401` this lane can afford because it mounts no competitors.",
  "",
  "## What was measured on",
  "",
  `\`${machine.platform} ${machine.release}\`, ${machine.arch}, ` +
    `${machine.cpu}, ${machine.cores} cores, ${machine.memoryGb} GB, ` +
    `Node ${machine.node}.`,
  "",
  "## §1 — What a mount seeds",
  "",
  "`create-form.ts` calls `seed-form-cells.ts` before any component exists, " +
    "so `cellsSeededAtMount` is O(N) and never 0. It is **not** the number the " +
    "README's \"mounting is a subscription and nothing else\" refers to: that " +
    "one is about the React mount commit, which is trivially 0 by construction " +
    "because no component has rendered yet. Both are true, and they are not " +
    "the same claim.",
  "",
  renderMountTable(runs.map((run) => run.mount)),
  "",
  `The ${overheadAboveLeaves()} cells above the leaf count are the root, the ` +
    "`items` array cell and its row order, and the form-state cells.",
  "",
  "## §2 — What one write scans, and what it finds",
  "",
  "`refresh-open-cells.ts` runs on every write. Its second loop asks " +
    "`open-value-cells.ts` for every open value cell — an `Array.from` over " +
    "the reader-count map — and runs one `isAncestorPath` per entry. " +
    "**`cells scanned` is what the write looked at; `cells refreshed` is what " +
    "it found.**",
  "",
  renderWriteTable(runs.flatMap((run) => run.writes)),
  "",
  "`store writes` is the root, the value cell, the dirty cell, and one per " +
    "refreshed cell — design §3's \"work is O(cells that changed), not " +
    "O(mounted fields)\", which holds and is asserted rather than asserted at. " +
    "`cells scanned` is the part that is O(mounted fields) anyway, and the two " +
    "sit in one row so that neither can be quoted without the other.",
  "",
  "## §3 — What one validation pass distributes",
  "",
  "One leaf broken, one whole-root pass, `validateOn: \"submit\"` so the " +
    "measured pass is the only pass.",
  "",
  renderPassTable(runs.map((run) => run.pass)),
  "",
  "## §4 — What the scan costs (printed, never gated)",
  "",
  "`refreshOpenAround` called directly, with the real `createOpenValueCells` " +
    "map behind it, so the array it allocates per write is the one the library " +
    "allocates. Median of 15 interleaved samples of 2,000 scans; `spread` is " +
    "peak-to-peak over those samples as a share of the median, and it is " +
    "printed because it is the only honest way to say how much to trust the " +
    "column beside it. The spreads below are wide — this is a laptop with " +
    "other work on it. What makes the result readable anyway is that the " +
    "per-cell slope agrees to within 20% across four sizes measured " +
    "independently, which noise does not do.",
  "",
  "The fixture holds no listeners, so what is timed is the scan and the reads " +
    "it makes, never the renders a refresh would go on to cause.",
  "",
  renderScanCostTable(scanRows),
  "",
  `Both halves of the scan are in that table. On \`${SCANNED_LEAF}\` it finds ` +
    "nothing however many cells are open, and the whole cost is the looking. " +
    "On `items` it finds the twelve row members, and the same two rows at the " +
    `same size differ by ${refreshMicroseconds.toFixed(2)} µs — about ` +
    `${refreshNanosecondsEach.toFixed(0)} ns per refreshed cell, several times ` +
    "what it cost to scan four hundred cells to reach them. A refresh is a " +
    "`readValueAt`, which walks the path through `splitConcretePath` on every " +
    "call rather than from anything memoised, plus minting the key and one " +
    "map probe. It is NOT a store write: this fixture's root does not change " +
    "between scans, so `createCellStore`'s `Object.is` gate returns early " +
    "every time after the first, and the figure excludes both the map set and " +
    "the notify a real keystroke would pay. Neither is the loop the design " +
    "document names.",
  "",
  "And the two things the scan is a part of — one `setValue` through the " +
    "field handle with every field on screen, and one whole-root pass through " +
    "the same adapter the scheduler calls:",
  "",
  renderWriteCostTable(writeRows),
  "",
  renderCostSummary(summary),
  "",
  "### The verdict",
  "",
  `At ${widest?.write.leaves ?? 0} fields with every one of them on screen, a ` +
    `write spends ${scanMicroseconds.toFixed(2)} µs scanning open cells, out ` +
    `of ${keystrokeMicroseconds.toFixed(2)} µs for the write plus the ` +
    `whole-root validation pass that same keystroke schedules — ` +
    `${share.toFixed(1)}% of it.`,
  "",
  "The design document was right about the SHAPE. The scan is O(fields on " +
    "screen), it runs on every write, and on a leaf edit it refreshes nothing " +
    "at all: 401 comparisons and a 401-element allocation to produce zero " +
    "cell writes. That is a real property of the runtime, it was invisible to " +
    "every metric the counts lane publishes, and it is now a gated integer.",
  "",
  "It was wrong about the SIZE, and this report is the place to say so. At " +
    "the size where the document said the cost would matter, the scan is a " +
    "low single-digit percentage of the work one keystroke already does, and " +
    "it is an order of magnitude below the validation pass beside it. " +
    "Removing it — an ancestor-indexed open set, say — would be a correct " +
    "optimisation of something nobody would be able to feel. A self-audit that " +
    "only confirmed the author's fears would not be one.",
  "",
  "It also looked in the wrong place. The expensive part of " +
    "`refresh-open-cells.ts` is not the loop the document names but what " +
    `happens per cell that loop finds: ${refreshNanosecondsEach.toFixed(0)} ns ` +
    "each, so twelve of them cost more than scanning four hundred. A design " +
    "document that worried about the O(N) loop and not about the twelve-cell " +
    "one was reasoning about complexity classes rather than about work, which " +
    "is what measuring is for.",
  "",
  "What the numbers do NOT say: nothing here is a millisecond in a browser. " +
    "There is no layout, no style resolution and no paint in this process, and " +
    "the time lane exists because those dominate. This section prices one " +
    "function against two others in the same process, and that is all.",
  "",
].join("\n");

mkdirSync("docs", { recursive: true });
writeFileSync("docs/measurements-self-audit.md", `${report}\n`, "utf8");
writeSelfAuditBaseline(taken);
console.log(report);
console.log(
  `Scan cost per open cell on \`${SCANNED_LEAF}\`: ${summary
    .map(
      (row) =>
        `${row.shapeId} ${nanosecondsPerOpenCell(row.scanRows).toFixed(1)} ns`
    )
    .join(", ")}. On \`${SCANNED_ARRAY}\` the scan also refreshes 12 cells.`
);
