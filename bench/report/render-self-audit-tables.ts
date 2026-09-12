// ===========================================================================
// render-self-audit-tables.ts — the self-audit tier, printed so that neither
// half of it can be quoted without the other.
//
// Two numbers sit on the same row on purpose. `cells scanned` is what the write
// LOOKED AT and `cells refreshed` is what it FOUND, and the gap between them is
// the entire accusation this lane answers. A table with only the second is the
// table the counts lane already prints; a table with only the first is a scare.
//
// The gated integers and the ungated nanoseconds render through different
// functions into different sections, because they are not the same kind of
// claim and a reader skimming one should not have to work out which kind they
// are looking at. Every ungated table carries its own spread column for the
// same reason.
// ===========================================================================
import { table } from "./markdown-table.ts";
import type { ScanCostRow } from "../self-audit/measure-scan-cost.ts";
import { nanosecondsPerOpenCell } from "../self-audit/measure-scan-cost.ts";
import type { WriteCostRow } from "../self-audit/measure-write-cost.ts";
import type {
  MountRow,
  PassRow,
  WriteRow,
} from "../self-audit/self-audit.types.ts";

const fixed = (value: number, places: number): string => value.toFixed(places);

export const renderMountTable = (rows: readonly MountRow[]): string =>
  table(
    ["shape", "leaves", "cells seeded at mount", "of those, value cells", "store reads"],
    rows.map((row) => [
      row.shapeId,
      String(row.leaves),
      String(row.cellsSeededAtMount),
      String(row.valueCellsSeeded),
      String(row.storeReadsAtMount),
    ])
  );

export const renderWriteTable = (rows: readonly WriteRow[]): string =>
  table(
    [
      "shape",
      "scenario",
      "wrote",
      "open cells",
      "cells scanned",
      "ancestor probes",
      "cells refreshed",
      "store writes",
      "store reads",
      "notifications",
    ],
    rows.map((row) => [
      row.shapeId,
      row.scenarioId,
      `\`${row.writtenPath}\``,
      String(row.openValueCells),
      String(row.openCellScanLength),
      String(row.ancestorProbes),
      String(row.valueCellsRefreshed),
      String(row.storeWrites),
      String(row.storeReads),
      String(row.notificationsDelivered),
    ])
  );

export const renderPassTable = (rows: readonly PassRow[]): string =>
  table(
    ["shape", "leaves", "issues produced", "issue cells written", "notifications"],
    rows.map((row) => [
      row.shapeId,
      String(row.leaves),
      String(row.issuesProduced),
      String(row.issueCellsWritten),
      String(row.notificationsDelivered),
    ])
  );

export const renderScanCostTable = (rows: readonly ScanCostRow[]): string =>
  table(
    [
      "shape",
      "wrote",
      "cells scanned",
      "cells refreshed",
      "µs per scan (median)",
      "spread",
    ],
    rows.map((row) => [
      row.shapeId,
      `\`${row.writtenPath}\``,
      String(row.openValueCells),
      String(row.cellsRefreshed),
      fixed(row.nanosecondsPerScan / 1000, 3),
      `${fixed(row.spreadPercent, 1)}%`,
    ])
  );

export const renderWriteCostTable = (rows: readonly WriteCostRow[]): string =>
  table(
    [
      "shape",
      "open cells",
      "µs per setValue",
      "spread",
      "µs per validation pass",
      "spread",
    ],
    rows.map((row) => [
      row.shapeId,
      String(row.openValueCells),
      fixed(row.nanosecondsPerWrite / 1000, 3),
      `${fixed(row.writeSpreadPercent, 1)}%`,
      fixed(row.nanosecondsPerPass / 1000, 3),
      `${fixed(row.passSpreadPercent, 1)}%`,
    ])
  );

export interface CostSummaryRow {
  readonly shapeId: string;
  /** One path's rungs, so the slope is a slope in one situation. */
  readonly scanRows: readonly ScanCostRow[];
  readonly write: WriteCostRow;
}

/** What the scan costs at full screen, against what it is a part of. */
export const renderCostSummary = (rows: readonly CostSummaryRow[]): string =>
  table(
    [
      "shape",
      "ns per open cell",
      "µs scanning at full screen",
      "µs for setValue + one pass",
      "the scan's share",
    ],
    rows.map((row) => {
      const widest = row.scanRows[row.scanRows.length - 1];
      const scanning = widest?.nanosecondsPerScan ?? 0;
      const keystroke = row.write.nanosecondsPerWrite + row.write.nanosecondsPerPass;
      return [
        row.shapeId,
        fixed(nanosecondsPerOpenCell(row.scanRows), 1),
        fixed(scanning / 1000, 3),
        fixed(keystroke / 1000, 3),
        keystroke === 0 ? "—" : `${fixed((scanning / keystroke) * 100, 1)}%`,
      ];
    })
  );
