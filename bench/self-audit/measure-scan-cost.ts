// ===========================================================================
// measure-scan-cost.ts — what `refreshOpenAround` costs, on its own.
//
// The counts in this lane are gated because an integer taken from the store is
// the same integer on every runner. A nanosecond is not, so nothing in this
// file is recorded, compared or allowed to fail a build. It is printed under
// the machine it was taken on, which is the rule the browser lane follows.
//
// THE REAL FUNCTION, WITH THE REAL OPEN-CELL MAP. `refreshOpenAround` and
// `createOpenValueCells` both come from `./core`, so the array `forEachOpen`
// allocates here is the array the library allocates on every keystroke. A
// hand-rolled stand-in would have measured the stand-in, and that allocation is
// half of what the design document was worried about.
//
// ISOLATED, rather than subtracted out of a whole write. `writeValueAt` rebuilds
// the root every keystroke, its allocation dominates, and measured on this
// machine it swings by 3× between runs under load. Subtracting two noisy
// numbers to find a small one is how a harness reports noise as a finding, so
// the scan is called directly and the whole write is measured separately, in
// measure-write-cost.ts, as the thing to read it against.
//
// TWO PATHS, because the scan's second loop finds nothing on a leaf edit and
// twelve cells on a write at the array above them. Timing only the first would
// price the scan at its cheapest and call that the cost.
//
// The median comes from the browser lane's `statistics.ts`, so the repository's
// two ungated lanes do not each grow their own idea of one.
// ===========================================================================
import {
  createCellStore,
  createOpenValueCells,
  refreshOpenAround,
  ROOT_CELL,
  type FormCellStore,
  type OpenValueCells,
} from "@maroonedog/waypoint/core";
import { median, relativeSpreadPercent } from "../browser/statistics.ts";
import type { Shape } from "../shape/build-shape.ts";
import { refreshesProducedBy, scanShapeOf } from "./count-open-cell-scan.ts";

export const SCANNED_LEAF = "applicant.lastName";
export const SCANNED_ARRAY = "items";
const SCANS_PER_SAMPLE = 2_000;
const SAMPLES = 15;
const WARM_SAMPLES = 3;

export interface ScanCostRow {
  readonly shapeId: string;
  readonly writtenPath: string;
  readonly openValueCells: number;
  /**
   * Open cells the scan finds and re-reads. Printed beside the time because
   * without it the `items` rows look like a measurement failure rather than
   * what they are: the moment the scan stops finding nothing.
   */
  readonly cellsRefreshed: number;
  readonly nanosecondsPerScan: number;
  /** Peak-to-peak over the samples, as a percentage of the median. */
  readonly spreadPercent: number;
}

/** Open cells at each rung: one field on screen, a quarter, a half, all. */
export const rungsFor = (leaves: number): readonly number[] =>
  [...new Set([1, Math.ceil(leaves / 4), Math.ceil(leaves / 2), leaves])].sort(
    (one, other) => one - other
  );

interface ScanFixture {
  readonly store: FormCellStore;
  readonly open: OpenValueCells;
  readonly root: unknown;
}

function fixtureFor(shape: Shape, openCells: number): ScanFixture {
  const store = createCellStore();
  const root = shape.defaults();
  store.write(ROOT_CELL, root);
  const open = createOpenValueCells();
  for (const leaf of shape.concretePaths.slice(0, openCells)) open.open(leaf);
  return { store, open, root };
}

function nanosecondsPerScan(fixture: ScanFixture, path: string): number {
  const started = process.hrtime.bigint();
  for (let index = 0; index < SCANS_PER_SAMPLE; index += 1) {
    refreshOpenAround(fixture.store, fixture.open, fixture.root, path);
  }
  return Number(process.hrtime.bigint() - started) / SCANS_PER_SAMPLE;
}

/**
 * Interleaved across rungs: every rung is sampled once before any is sampled
 * twice, so a machine that slows down halfway through spreads the damage over
 * the rungs instead of putting all of it on the last one.
 */
export function measureScanCost(shape: Shape): readonly ScanCostRow[] {
  const rungs = rungsFor(shape.concretePaths.length);
  const fixtures = rungs.map((openCells) => fixtureFor(shape, openCells));
  const rows: ScanCostRow[] = [];

  for (const path of [SCANNED_LEAF, SCANNED_ARRAY]) {
    const samples = rungs.map((): number[] => []);
    for (let round = 0; round < WARM_SAMPLES; round += 1) {
      for (const fixture of fixtures) nanosecondsPerScan(fixture, path);
    }
    for (let round = 0; round < SAMPLES; round += 1) {
      fixtures.forEach((fixture, position) => {
        samples[position]?.push(nanosecondsPerScan(fixture, path));
      });
    }
    rungs.forEach((openValueCells, position) => {
      const taken = samples[position] ?? [];
      rows.push({
        shapeId: shape.id,
        writtenPath: path,
        openValueCells,
        cellsRefreshed: refreshesProducedBy(
          scanShapeOf(shape.concretePaths.slice(0, openValueCells), path)
        ),
        nanosecondsPerScan: median(taken),
        spreadPercent: relativeSpreadPercent(taken),
      });
    });
  }
  return rows;
}

/** Nanoseconds per open cell, least squares over one path's rungs. */
export function nanosecondsPerOpenCell(rows: readonly ScanCostRow[]): number {
  if (rows.length < 2) return 0;
  const cells = rows.map((row) => row.openValueCells);
  const times = rows.map((row) => row.nanosecondsPerScan);
  const meanCells = cells.reduce((one, other) => one + other, 0) / cells.length;
  const meanTime = times.reduce((one, other) => one + other, 0) / times.length;
  let covariance = 0;
  let variance = 0;
  cells.forEach((count, position) => {
    covariance += (count - meanCells) * ((times[position] ?? 0) - meanTime);
    variance += (count - meanCells) ** 2;
  });
  return variance === 0 ? 0 : covariance / variance;
}
