// ===========================================================================
// self-audit-baseline.ts — the recorded integers, and every way a run can
// differ from them.
//
// The same argument as `report/baseline.ts`: nothing in this lane depends on
// the machine, so a drift is never noise. Something in the runtime changed what
// a mount seeds, what a write touches, or how far a write has to look.
//
// A row is an id and a bag of named integers rather than a fixed set of
// columns, and that is deliberate. The comparison walks the union of both
// sides' names, so a metric ADDED to this lane later is reported as new and
// fails `--check` until somebody records it — which is the failure mode a fixed
// column list quietly does not have.
// ===========================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SelfAuditRun } from "./self-audit.types.ts";

const FILE = "config/self-audit-baseline.json";

export interface SelfAuditBaselineRow {
  readonly id: string;
  readonly counts: Readonly<Record<string, number>>;
}

export type SelfAuditBaseline = readonly SelfAuditBaselineRow[];

export function toSelfAuditBaseline(
  runs: readonly SelfAuditRun[]
): SelfAuditBaseline {
  const rows: SelfAuditBaselineRow[] = [];
  for (const run of runs) {
    rows.push({
      id: `${run.mount.shapeId}|mount`,
      counts: {
        leaves: run.mount.leaves,
        cellsSeededAtMount: run.mount.cellsSeededAtMount,
        valueCellsSeeded: run.mount.valueCellsSeeded,
        storeReadsAtMount: run.mount.storeReadsAtMount,
      },
    });
    for (const write of run.writes) {
      rows.push({
        id: `${write.shapeId}|write|${write.scenarioId}`,
        counts: {
          leaves: write.leaves,
          openValueCells: write.openValueCells,
          openCellScanLength: write.openCellScanLength,
          ancestorProbes: write.ancestorProbes,
          valueCellsRefreshed: write.valueCellsRefreshed,
          storeWrites: write.storeWrites,
          storeReads: write.storeReads,
          notificationsDelivered: write.notificationsDelivered,
        },
      });
    }
    rows.push({
      id: `${run.pass.shapeId}|pass`,
      counts: {
        leaves: run.pass.leaves,
        issuesProduced: run.pass.issuesProduced,
        issueCellsWritten: run.pass.issueCellsWritten,
        notificationsDelivered: run.pass.notificationsDelivered,
      },
    });
  }
  return rows.sort((one, other) => one.id.localeCompare(other.id));
}

export function readSelfAuditBaseline(): SelfAuditBaseline {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8")) as SelfAuditBaseline;
}

export function writeSelfAuditBaseline(baseline: SelfAuditBaseline): void {
  mkdirSync("config", { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

/** Every difference from what was recorded, in plain sentences. */
export function compareSelfAuditBaseline(
  recorded: SelfAuditBaseline,
  taken: SelfAuditBaseline
): readonly string[] {
  if (recorded.length === 0) {
    return ["No baseline is recorded yet; run without --check to write one."];
  }
  const byId = new Map(recorded.map((row) => [row.id, row]));
  const drift: string[] = [];

  for (const row of taken) {
    const before = byId.get(row.id);
    if (before === undefined) {
      drift.push(`${row.id} is new`);
      continue;
    }
    byId.delete(row.id);
    const names = new Set([
      ...Object.keys(before.counts),
      ...Object.keys(row.counts),
    ]);
    for (const name of [...names].sort()) {
      const was = before.counts[name];
      const now = row.counts[name];
      if (was === now) continue;
      drift.push(
        `${row.id} ${name}: ${was === undefined ? "absent" : was} -> ` +
          `${now === undefined ? "absent" : now}`
      );
    }
  }
  for (const missing of byId.keys()) drift.push(`${missing} is gone`);
  return drift;
}
