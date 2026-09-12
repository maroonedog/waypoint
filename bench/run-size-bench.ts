// ===========================================================================
// run-size-bench.ts — measure, and either record or check.
//
// The same shape as the counts lane, and for the same reason: a size that is
// printed and never compared is a size that grows. `--check` exits non-zero
// when a package crosses its recorded budget, so a dependency that arrives by
// accident fails the build rather than the next reader's bundle.
//
// The budget is not the measurement. It is the measurement plus a margin, so
// that ordinary churn does not cry wolf and a step change does.
// ===========================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { measureBundleSize, type SizeRow } from "./size/measure-bundle-size.ts";

const BUDGET_FILE = new URL("../config/size-budget.json", import.meta.url);

interface Budget {
  readonly takenBy: string;
  readonly marginPercent: number;
  readonly rows: readonly (SizeRow & { readonly budget: number })[];
}

const MARGIN = 10;
const kb = (bytes: number): string => `${(bytes / 1024).toFixed(2)} kB`;

const recording = !process.argv.includes("--check");
const measured = await measureBundleSize();

if (recording) {
  const budget: Budget = {
    takenBy: "npm run size",
    marginPercent: MARGIN,
    rows: measured.map((row) => ({
      ...row,
      budget: Math.ceil((row.gzipped * (100 + MARGIN)) / 100),
    })),
  };
  writeFileSync(BUDGET_FILE, `${JSON.stringify(budget, null, 2)}\n`);
  for (const row of budget.rows) {
    console.log(`${row.id.padEnd(58)} ${kb(row.gzipped).padStart(9)} gzipped`);
  }
  console.log(`\nRecorded, each with a ${MARGIN}% margin.`);
} else {
  const budget = JSON.parse(readFileSync(BUDGET_FILE, "utf8")) as Budget;
  const byId = new Map(budget.rows.map((row) => [row.id, row]));
  const over: string[] = [];

  for (const row of measured) {
    const recorded = byId.get(row.id);
    if (recorded === undefined) {
      over.push(`${row.id} is not in the budget file — record it.`);
      continue;
    }
    const verdict = row.gzipped > recorded.budget ? "OVER" : "ok";
    console.log(
      `${row.id.padEnd(58)} ${kb(row.gzipped).padStart(9)} / ${kb(recorded.budget).padStart(9)}  ${verdict}`
    );
    if (verdict === "OVER") {
      over.push(
        `${row.id}: ${kb(row.gzipped)} gzipped, budget ${kb(recorded.budget)}.`
      );
    }
  }

  if (over.length > 0) {
    console.error(`\n${over.join("\n")}`);
    console.error(
      "\nIf the growth is intended, rerun without --check to record it and say in the commit what arrived."
    );
    process.exit(1);
  }
  console.log("\nEvery package is inside its recorded budget.");
}
