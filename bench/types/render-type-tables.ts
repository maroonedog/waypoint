// ===========================================================================
// render-type-tables.ts — the sweep, as the tables the report prints.
//
// Every instantiation figure here is a DELTA and says so in its heading. An
// absolute from `--extendedDiagnostics` contains lib.d.ts and both packages'
// own source, and two people quoting absolutes taken from differently sized
// programs will disagree by an order of magnitude while both being right about
// what they ran. Subtracting the floor is what makes two rows comparable.
//
// The refused column is not an error report. A leaf the path type will not
// accept is the budget doing its job, and printing it beside the leaf count is
// the only way a reader can tell "this shape is expensive" from "this shape is
// not addressable at all" — which are opposite conclusions and were being
// drawn from the same number.
// ===========================================================================
import { code, table } from "../report/markdown-table.ts";
import type { ShapeRow, SweepResult } from "./sweep-type-shapes.ts";
import type { TscMeasurement } from "./measure-with-tsc.ts";

const grouped = (value: number): string => value.toLocaleString("en-US");
const signed = (value: number): string =>
  `${value >= 0 ? "+" : "−"}${grouped(Math.abs(value))}`;
const seconds = (value: number): string => `${value.toFixed(2)}s`;
const megabytes = (kilobytes: number): string =>
  `${Math.round(kilobytes / 1024)} MB`;

/** Counted leaves the path type actually accepts — the rest were truncated. */
export const addressableLeaves = (row: ShapeRow): number =>
  row.shape.leafPaths.length - row.refusedLeaves.length;

const SHAPE_HEADER = [
  "shape",
  "leaves (counted)",
  "addressable",
  "interfaces",
  "building the union",
  "per addressable leaf",
  "Check time, 0 calls",
  "1 call",
  "every leaf",
  "per call",
] as const;

const shapeRow = (row: ShapeRow, packagesOnly: TscMeasurement): string[] => {
  const calls = row.shape.leafPaths.length;
  const reachable = addressableLeaves(row);
  const build = row.baseline.instantiations - packagesOnly.instantiations;
  const first = row.oneCall.instantiations - row.baseline.instantiations;
  const every = row.everyLeaf.instantiations - row.baseline.instantiations;
  return [
    code(row.shape.id),
    String(calls),
    reachable === calls ? `all ${calls}` : `**${reachable}**`,
    String(row.shape.interfaceCount),
    signed(build),
    reachable === 0 ? "n/a — none is" : Math.round(build / reachable).toString(),
    seconds(row.baseline.typeCheckSeconds),
    signed(first),
    signed(every),
    calls === 0 ? "n/a" : (every / calls).toFixed(1),
  ];
};

const pick = (
  result: SweepResult,
  matches: (row: ShapeRow) => boolean
): string =>
  table(
    SHAPE_HEADER,
    result.rows
      .filter(matches)
      .map((row) => shapeRow(row, result.packagesOnly))
  );

export const renderDepthSweep = (result: SweepResult): string =>
  pick(result, (row) => row.shape.id.startsWith("depth-"));

export const renderWidthSweep = (result: SweepResult): string =>
  pick(result, (row) => row.shape.id.startsWith("width-"));

export const renderContainerShapes = (result: SweepResult): string =>
  pick(
    result,
    (row) =>
      !row.shape.id.startsWith("depth-") &&
      !row.shape.id.startsWith("width-") &&
      !row.shape.id.startsWith("opaque-")
  );

/** The escape hatch beside the shape it was applied to, so the row is a saving. */
export const renderEscapeHatch = (result: SweepResult): string =>
  pick(
    result,
    (row) =>
      row.shape.id === "depth-6-distinct" || row.shape.id.startsWith("opaque-")
  );

/** The floors, printed so that every delta above can be undone by a reader. */
export const renderFloors = (result: SweepResult): string => {
  const floors: readonly (readonly [string, TscMeasurement])[] = [
    ["`empty` — lib.d.ts and nothing else", result.empty],
    ["`packages-only` — both packages imported, no shape", result.packagesOnly],
  ];
  return table(
    ["program", "instantiations", "types", "Check time", "Memory used"],
    floors.map(([label, measured]) => [
      label,
      grouped(measured.instantiations),
      grouped(measured.types),
      seconds(measured.typeCheckSeconds),
      megabytes(measured.memoryKilobytes),
    ])
  );
};

/** The same program, compiled again — the whole argument for gating anything. */
export const renderRepeats = (result: SweepResult): string =>
  table(
    ["compile", "instantiations", "types", "Check time", "Memory used", "wall clock"],
    result.repeated.map((measured, index) => [
      `${index + 1}`,
      grouped(measured.instantiations),
      grouped(measured.types),
      seconds(measured.typeCheckSeconds),
      megabytes(measured.memoryKilobytes),
      `${measured.elapsedMilliseconds} ms`,
    ])
  );

/**
 * Where `PathDepthBudget` stops. The self-referential root has one leaf per
 * hop, so the hop the compiler starts refusing IS the budget, measured rather
 * than read off the type.
 */
export const renderBudgetTruncation = (result: SweepResult): string => {
  const row = result.rows.find((found) => found.shape.id === "self-referential");
  if (row === undefined) return "_The self-referential shape was not run._";
  const refused = new Map(
    row.refusedLeaves.map((found) => [found.path, found.code])
  );
  return table(
    ["hops below the root", "path", "segments", "useField accepts it"],
    row.shape.leafPaths.map((path, hop) => {
      const refusal = refused.get(path);
      return [
        String(hop),
        code(path),
        String(path.split(".").length),
        refusal === undefined ? "yes" : `**no** — ${refusal}`,
      ];
    })
  );
};

/** Every distinct diagnostic the whole sweep produced, and where. */
export const renderDiagnosticCodes = (result: SweepResult): string => {
  const byCode = new Map<string, string[]>();
  for (const row of result.rows) {
    const here = row.refusedLeaves;
    for (const found of new Set(here.map((each) => each.code))) {
      const refused = here.filter((each) => each.code === found).length;
      byCode.set(found, [
        ...(byCode.get(found) ?? []),
        `${code(row.shape.id)} (${refused})`,
      ]);
    }
  }
  if (byCode.size === 0) {
    return "**No diagnostic of any kind was reported by any program in the sweep.**";
  }
  return table(
    ["code", "shapes that produced it, and how many calls it refused in each"],
    [...byCode].map(([found, shapes]) => [code(found), shapes.join(", ")])
  );
};
