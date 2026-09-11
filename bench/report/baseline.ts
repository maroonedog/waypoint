// ===========================================================================
// baseline.ts — the counts, recorded so a change has to be explained.
//
// Every figure in this lane is an integer that does not depend on the machine,
// which is the only reason a gate like this can exist at all. A drift is
// therefore never noise: something in a library, in React, or in this
// repository changed what the form actually does.
//
// A row is identified by subject, scenario and size. Losses are compared by
// IDENTITY rather than by count: a loss that quietly disappears while another
// appears is exactly the change a count would hide.
// ===========================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ShapeRun } from "../run-shape.ts";

const FILE = "config/form-baseline.json";

export interface BaselineRow {
  readonly shapeId: string;
  readonly subjectId: string;
  readonly scenarioId: string;
  readonly agreement: string;
  readonly commits: number;
  readonly changedFibers: number;
  readonly changedHostFibers: number;
  readonly validatorPasses: number;
  readonly pathsJudged: number;
}

export type Baseline = readonly BaselineRow[];

const keyOf = (row: BaselineRow): string =>
  `${row.shapeId}|${row.subjectId}|${row.scenarioId}`;

export function toBaseline(runs: readonly ShapeRun[]): Baseline {
  return runs
    .flatMap((run) =>
      run.measurements.map((measurement) => ({
        shapeId: run.shapeId,
        subjectId: measurement.subjectId,
        scenarioId: measurement.scenarioId,
        agreement:
          run.cells.get(`${measurement.subjectId}|${measurement.scenarioId}`) ??
          "unknown",
        commits: measurement.commits,
        changedFibers: measurement.changedFibers,
        changedHostFibers: measurement.changedHostFibers,
        validatorPasses: measurement.validatorPasses,
        pathsJudged: measurement.pathsJudged,
      }))
    )
    .sort((one, other) => keyOf(one).localeCompare(keyOf(other)));
}

export function readBaseline(): Baseline {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8")) as Baseline;
}

export function writeBaseline(baseline: Baseline): void {
  mkdirSync("config", { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

/** Every way the run differs from what was recorded, in plain sentences. */
export function compareBaseline(
  recorded: Baseline,
  taken: Baseline
): readonly string[] {
  if (recorded.length === 0) {
    return ["No baseline is recorded yet; run without --check to write one."];
  }
  const byKey = new Map(recorded.map((row) => [keyOf(row), row]));
  const drift: string[] = [];

  for (const row of taken) {
    const before = byKey.get(keyOf(row));
    if (before === undefined) {
      drift.push(`${keyOf(row)} is new`);
      continue;
    }
    byKey.delete(keyOf(row));
    for (const field of [
      "agreement",
      "commits",
      "changedFibers",
      "changedHostFibers",
      "validatorPasses",
      "pathsJudged",
    ] as const) {
      if (before[field] !== row[field]) {
        drift.push(
          `${keyOf(row)} ${field}: ${String(before[field])} -> ${String(row[field])}`
        );
      }
    }
  }
  for (const missing of byKey.keys()) {
    drift.push(`${missing} is gone`);
  }
  return drift;
}
