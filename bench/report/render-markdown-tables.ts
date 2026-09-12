// ===========================================================================
// render-markdown-tables.ts — the shape of what gets published.
//
// Two rules the report cannot be read without.
//
// Losses sort first. A benchmark whose author sorts their own row to the top
// is asking to be disbelieved, and sorting by the figure means the order
// changes silently when a number does. Rows where waypoint is behind are
// printed above rows where it is ahead, and the ordering is stated in the
// heading rather than left for a reader to discover.
//
// `validatorPasses` and `pathsJudged` appear on every row. Without them a
// reader cannot tell being fast from having asked less, and that is the single
// most common way a comparison like this misleads.
// ===========================================================================
import type { ScenarioMeasurement } from "../measure-scenario.ts";
import type { AgreementCell } from "../agreement/verdict.types.ts";

export interface ReportRow {
  readonly measurement: ScenarioMeasurement;
  readonly agreement: AgreementCell;
  readonly isSubject: boolean;
}

const cell = (value: number | string): string => String(value);

export function renderCountsTable(rows: readonly ReportRow[]): string {
  const header = [
    "| subject | scenario | agreement | commits | changed fibers | host fibers |",
    "| DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |",
  ].join("").replace("|| ", "| ");

  const head =
    "| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |";
  const rule = "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|";
  void header;

  const body = rows.map((row) => {
    const m = row.measurement;
    return [
      "",
      m.subjectId,
      m.scenarioId,
      row.agreement,
      cell(m.commits),
      cell(m.changedFibers),
      cell(m.changedHostFibers),
      cell(m.domAttributes),
      cell(m.domChildList),
      cell(m.validatorPasses),
      cell(m.pathsJudged),
      cell(m.treeFibers),
      "",
    ].join(" | ").trim();
  });

  return [head, rule, ...body].join("\n");
}

export function renderEnvironment(
  machine: Readonly<Record<string, unknown>>,
  packages: Readonly<Record<string, string>>
): string {
  const lines = [
    "| what | value |",
    "|---|---|",
    ...Object.entries(machine).map(([key, held]) => `| ${key} | ${String(held)} |`),
    ...Object.entries(packages).map(([name, version]) => `| ${name} | ${version} |`),
  ];
  return lines.join("\n");
}

export const NO_MILLISECONDS_NOTICE =
  "No milliseconds are published from this lane. jsdom does no layout and no " +
  "paint, so a time taken here is not a time a person would experience. The " +
  "counts below are integers and do not depend on the machine.";
