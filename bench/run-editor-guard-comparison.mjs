import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { cpus, totalmem, platform, release } from "node:os";
import ts from "typescript";
import { EDITOR_WORKLOADS } from "./editor/workloads.mjs";
import { median } from "./editor/report.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const worker = fileURLToPath(new URL("./editor/measure-service.mjs", import.meta.url));
const thirty = EDITOR_WORKLOADS.find(row => row.id === "thirty-forms");
const workloads = [...EDITOR_WORKLOADS, { ...thirty, id: "thirty-mixed", mixedValues: true }];
const cases = workloads.map(workload => ({ workload, operation: "completion", trials: workload.id === "thirty-forms" ? 6 : 3 }));
cases.push(...["hover", "diagnostics"].map(operation => ({ workload: thirty, operation, trials: 3 })));
const samples = [];
const dist = join(root, "packages/waypoint/dist");
function declarationHash() {
  const hash = createHash("sha256");
  const files = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".d.ts"))
    .map(entry => join(entry.parentPath, entry.name)).sort();
  if (!files.length) throw new Error("Build the package first");
  for (const file of files) hash.update(relative(dist, file).replaceAll("\\", "/")).update("\0").update(readFileSync(file)).update("\0");
  return hash.digest("hex");
}
const before = declarationHash();
for (const { workload, operation, trials } of cases) {
  for (let trial = 0; trial < trials; trial++) {
    const variants = trial % 2 ? ["before-guard", "current"] : ["current", "before-guard"];
    for (const variant of variants) {
      const { stdout } = await run(process.execPath, [worker, JSON.stringify({ workload, operation, variant })], {
        cwd: root, timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
      });
      const sample = { ...JSON.parse(stdout), trial };
      samples.push(sample);
      console.log(`${workload.id} ${operation} ${trial + 1}/${trials} ${variant}: ${median(sample.editedMs.map(value => value.ms)).toFixed(2)} ms edited`);
    }
  }
}
if (before !== declarationHash()) throw new Error("Declarations changed during measurement");
const rows = cases.map(({ workload, operation, trials }) => {
  const paired = Array.from({ length: trials }, (_, trial) => {
    const matched = samples.filter(sample => sample.workload.id === workload.id && sample.operation === operation && sample.trial === trial);
    const current = matched.find(sample => sample.variant === "current");
    const previous = matched.find(sample => sample.variant === "before-guard");
    const currentMs = median(current.editedMs.map(value => value.ms));
    const previousMs = median(previous.editedMs.map(value => value.ms));
    return { trial, first: trial % 2 ? "before-guard" : "current", currentMs, previousMs, changePercent: (currentMs / previousMs - 1) * 100 };
  });
  return { workload, operation, trials, paired };
});
const record = {
  recordedAt: new Date().toISOString(), typescript: ts.version, node: process.version,
  machine: { cpu: cpus()[0]?.model.trim(), cores: cpus().length, memoryGiB: +(totalmem() / 1024 ** 3).toFixed(1), platform: `${platform()} ${release()}` },
  declarationHash: before,
  sourceHashes: Object.fromEntries(["run-editor-guard-comparison.mjs", "editor/measure-service.mjs", "editor/workloads.mjs", "editor/report.mjs"].map(file => [file, createHash("sha256").update(readFileSync(join(root, "bench", file))).digest("hex")])),
  rows, samples,
};
writeFileSync(join(root, "docs/measurements-editor-guard.json"), JSON.stringify(record, null, 2) + "\n");
writeFileSync(join(root, "docs/measurements-editor-guard.md"), `# Separating path inference from the inhabited-path guard

Run: \`npm run bench:editor:guard\`. Same Language Service host and timing boundaries
as [the original sweep](measurements-editor.md). Independent sequential processes,
with first variant reversed in every pair. No CPU profiler is active during timing.
Both variants retain adapter identity and check path validity. \`before-guard\`
replaces only \`Q & NoInfer<InhabitedFormPath<Q>>\` with the original parameter type
\`Q & InhabitedFormPath<Q>\` in memory; package files are not edited.

Each variant's cell is a median of process medians over edited requests, in ms.
Percentage is the median of paired changes, with its observed min/max, not the
ratio of aggregate medians. Negative means current is faster. Warm unchanged,
cold, per-edit and memory samples are available in the raw record.

| workload | operation | pairs | baseline (ms) | current (ms) | paired change [range] |
|---|---|---:|---:|---:|---:|
${rows.map(row => `| ${row.workload.id} | ${row.operation} | ${row.trials} | ${median(row.paired.map(pair => pair.previousMs)).toFixed(2)} | ${median(row.paired.map(pair => pair.currentMs)).toFixed(2)} | ${median(row.paired.map(pair => pair.changePercent)).toFixed(2)}% [${Math.min(...row.paired.map(pair => pair.changePercent)).toFixed(2)}–${Math.max(...row.paired.map(pair => pair.changePercent)).toFixed(2)}]% |`).join("\n")}

\`thirty-mixed\` varies leaf types between string, number and boolean by form;
the probe remains in the first string-valued form. Other workload shapes match the
original sweep. The correctness audit checks every generated view, requires valid
completion candidates and refuses a deliberate typo. Timing is not a CI gate.
This is synthetic TypeScript 5.9 behavior, not a universal editor latency promise.

Recorded ${record.recordedAt}; TypeScript ${record.typescript}; Node ${record.node}.
Machine: ${record.machine.cpu}; ${record.machine.cores} logical CPUs;
${record.machine.memoryGiB} GiB; ${record.machine.platform}.
Declaration SHA-256: \`${before}\`.
[Raw paired samples and source hashes](measurements-editor-guard.json).
`);
