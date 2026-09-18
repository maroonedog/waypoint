// Confirm a suspected completion cost with alternating paired process order.
// Keep this separate from the sweep so its record remains an independent run.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";
import { EDITOR_WORKLOADS } from "./editor/workloads.mjs";
import { median } from "./editor/report.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const worker = fileURLToPath(new URL("./editor/measure-service.mjs", import.meta.url));
const workload = EDITOR_WORKLOADS.find(workload => workload.id === "thirty-forms");
const trials = 6;
const samples = [];
const dist = join(root, "packages/waypoint/dist");
const declarationHash = () => {
  const hash = createHash("sha256");
  const files = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".d.ts"))
    .map(entry => join(entry.parentPath, entry.name)).sort();
  if (!files.length) throw new Error("Build the package first");
  for (const file of files) hash.update(relative(dist, file).replaceAll("\\", "/")).update("\0").update(readFileSync(file)).update("\0");
  return hash.digest("hex");
};
const before = declarationHash();
for (let trial = 0; trial < trials; trial++) {
  const variants = trial % 2 ? ["without-identity", "current"] : ["current", "without-identity"];
  for (const variant of variants) {
    const { stdout } = await run(process.execPath, [worker, JSON.stringify({ workload, operation: "completion", variant })], {
      cwd: root, timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    const sample = { ...JSON.parse(stdout), trial };
    samples.push(sample);
    console.log(`Pair ${trial + 1}/${trials} ${variant}: edited ${median(sample.editedMs.map(value => value.ms)).toFixed(2)} ms`);
  }
}
if (before !== declarationHash()) throw new Error("Declarations changed during the run");
const paired = Array.from({ length: trials }, (_, trial) => {
  const current = samples.find(sample => sample.trial === trial && sample.variant === "current");
  const erased = samples.find(sample => sample.trial === trial && sample.variant === "without-identity");
  const currentMs = median(current.editedMs.map(value => value.ms));
  const erasedMs = median(erased.editedMs.map(value => value.ms));
  return { trial, first: trial % 2 ? "without-identity" : "current", currentMs, erasedMs, differencePercent: (currentMs / erasedMs - 1) * 100 };
});
const record = {
  recordedAt: new Date().toISOString(), typescript: ts.version, node: process.version,
  declarationHash: before,
  sourceHashes: Object.fromEntries(["run-editor-completion-focus.mjs", "editor/measure-service.mjs", "editor/workloads.mjs", "editor/report.mjs"].map(file => [file, createHash("sha256").update(readFileSync(join(root, "bench", file))).digest("hex")])),
  trials, paired, samples,
};
writeFileSync(join(root, "docs/measurements-editor-focus.json"), JSON.stringify(record, null, 2) + "\n");
writeFileSync(join(root, "docs/measurements-editor-focus.md"), `# Focused confirmation: editing completion with thirty forms

Run: \`npm run bench:editor:focus\`. Same workload, TypeScript Language Service host,
correctness assertions and timing boundaries as [the sweep](measurements-editor.md).
Each pair uses fresh sequential processes. First variant alternates on every pair.
This is an independent follow-up, not pooled into the original sweep.
No timing threshold is enforced. Counterfactual identity removal is not a safe API.

| pair | first variant | current edited median (ms) | counterfactual edited median (ms) | change |
|---|---|---:|---:|---:|
${paired.map(pair => `| ${pair.trial + 1} | ${pair.first} | ${pair.currentMs.toFixed(2)} | ${pair.erasedMs.toFixed(2)} | ${pair.differencePercent.toFixed(2)}% |`).join("\n")}

Median across pairs: current **${median(paired.map(pair => pair.currentMs)).toFixed(2)} ms**;
counterfactual **${median(paired.map(pair => pair.erasedMs)).toFixed(2)} ms**.
Median paired change: **${median(paired.map(pair => pair.differencePercent)).toFixed(2)}%**
(range ${Math.min(...paired.map(pair => pair.differencePercent)).toFixed(2)}% to ${Math.max(...paired.map(pair => pair.differencePercent)).toFixed(2)}%).

Recorded ${record.recordedAt}; TypeScript ${record.typescript}; Node ${record.node}.
Declaration SHA-256: \`${before}\`.
Raw timings, correctness evidence, endpoint memory and source hashes:
[measurements-editor-focus.json](measurements-editor-focus.json).

This isolates an emitted-declaration change in a synthetic all-string application.
It does not identify the compiler's internal hot path or establish editor UI latency.
All files are program roots, but other view bodies can remain lazily checked until
the untimed audit. Background project-wide diagnostics are not simulated.
`);
