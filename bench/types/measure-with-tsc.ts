// ===========================================================================
// measure-with-tsc.ts — one compile, and what it cost.
//
// `--extendedDiagnostics` is the compiler's own accounting, not a stopwatch
// held around it, so `Instantiations` is a property of the program and the
// compiler rather than of the machine. That split is the whole reason this
// lane can print a time column and still gate — if it gates — on a count.
//
// The compiler is the one in this repository's `node_modules`, spawned as a
// script rather than through `npx`. `npx` would resolve a compiler, print
// nothing about which, and change the numbers on a day nobody touched the
// types.
//
// A program that reports errors is still measured. A call the path type
// REFUSES is the interesting case at depth — the compiler did the work and
// then some, because it also elaborated the message — so throwing the
// measurement away there would discard the rows the report exists for.
// ===========================================================================
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TSC = fileURLToPath(
  new URL("../../node_modules/typescript/lib/tsc.js", import.meta.url)
);

export interface TypeErrorAtLine {
  readonly line: number;
  readonly code: string;
}

export interface TscMeasurement {
  readonly instantiations: number;
  readonly types: number;
  readonly symbols: number;
  readonly memoryKilobytes: number;
  readonly typeCheckSeconds: number;
  readonly totalSeconds: number;
  readonly errors: readonly TypeErrorAtLine[];
  /** Wall clock around the whole process, including node's own start-up. */
  readonly elapsedMilliseconds: number;
}

const DIAGNOSTIC_LINE = /(\d+),\d+\): error (TS\d+)/g;

const numberAfter = (output: string, label: string): number => {
  const found = new RegExp(`^${label}:\\s+([\\d.]+)`, "m").exec(output);
  return found === undefined || found === null ? Number.NaN : Number(found[1]);
};

/** Compiles the program already in `tsconfigPath`'s directory. */
export function measureWithTsc(tsconfigPath: string): TscMeasurement {
  const started = Date.now();
  let output: string;
  try {
    output = execFileSync(
      process.execPath,
      [TSC, "-p", tsconfigPath, "--extendedDiagnostics"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 }
    );
  } catch (thrown) {
    // A non-zero exit is what a reported error looks like; the diagnostics are
    // on stdout either way.
    const held = thrown as { stdout?: string; stderr?: string };
    output = `${held.stdout ?? ""}${held.stderr ?? ""}`;
  }
  const elapsedMilliseconds = Date.now() - started;

  const errors: TypeErrorAtLine[] = [];
  for (const found of output.matchAll(DIAGNOSTIC_LINE)) {
    errors.push({ line: Number(found[1]), code: String(found[2]) });
  }

  const instantiations = numberAfter(output, "Instantiations");
  if (Number.isNaN(instantiations)) {
    throw new Error(
      `tsc printed no Instantiations line for ${tsconfigPath}:\n${output.slice(0, 2000)}`
    );
  }

  return {
    instantiations,
    types: numberAfter(output, "Types"),
    symbols: numberAfter(output, "Symbols"),
    memoryKilobytes: numberAfter(output, "Memory used"),
    typeCheckSeconds: numberAfter(output, "Check time"),
    totalSeconds: numberAfter(output, "Total time"),
    errors,
    elapsedMilliseconds,
  };
}

/** What the measurements were taken with — stated, because they move with it. */
export function installedTypeScriptVersion(): string {
  const output = execFileSync(process.execPath, [TSC, "--version"], {
    encoding: "utf8",
  });
  return output.trim().replace(/^Version\s+/, "");
}
