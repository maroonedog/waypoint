import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { cpus, totalmem, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import ts from "typescript";
import { EDITOR_WORKLOADS } from "./editor/workloads.mjs";
import { editorReport } from "./editor/report.mjs";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const worker = fileURLToPath(new URL("./editor/measure-service.mjs", import.meta.url));
const smoke = process.argv.includes("--smoke");
const unknown = process.argv.slice(2).filter(argument => argument !== "--smoke");
if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(" ")}`);
const workloads = smoke ? EDITOR_WORKLOADS.slice(0, 1) : EDITOR_WORKLOADS;
const trials = smoke ? 1 : 3;
const operations = ["completion", "hover", "diagnostics"];
const variants = ["current", "without-identity"];
const samples = [];
const started = performance.now();

function fingerprint(directory, accepts) {
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))
    .filter(accepts).sort();
  if (!files.length) throw new Error(`No files found in ${directory}; build first`);
  const hash = createHash("sha256");
  for (const file of files) hash.update(relative(directory, file).replaceAll("\\", "/")).update("\0").update(readFileSync(file)).update("\0");
  return hash.digest("hex");
}
const declarationHash = fingerprint(join(root, "packages/waypoint/dist"), file => file.endsWith(".d.ts"));
const harnessHash = fingerprint(join(root, "bench"), file => file.includes(`${join("editor", "")}`) && file.endsWith(".mjs"));
for (let trial = 0; trial < trials; trial++) {
  for (let offset = 0; offset < workloads.length; offset++) {
    const workload = workloads[(offset + trial) % workloads.length];
    for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
      const operation = operations[operationIndex];
      const ordered = (trial + offset + operationIndex) % 2 ? [...variants].reverse() : variants;
      for (const variant of ordered) {
        const { stdout } = await run(process.execPath, [worker, JSON.stringify({ workload, operation, variant })], {
          cwd: root, timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
        });
        const result = JSON.parse(stdout);
        if (result.typescript !== ts.version) throw new Error("Worker used a different compiler");
        samples.push({ ...result, trial });
        console.log(`${samples.length}/${workloads.length * operations.length * variants.length * trials} ${workload.id} ${operation} ${variant}: cold ${result.coldMs.toFixed(1)} ms`);
      }
    }
  }
}
if (declarationHash !== fingerprint(join(root, "packages/waypoint/dist"), file => file.endsWith(".d.ts"))) {
  throw new Error("Declarations changed during measurement; discard this run");
}
const revision = (await run("git", ["rev-parse", "HEAD"], { cwd: root, windowsHide: true })).stdout.trim();
const record = {
  recordedAt: new Date().toISOString(), typescript: ts.version, node: process.version,
  packageVersion: JSON.parse(readFileSync(join(root, "packages/waypoint/package.json"), "utf8")).version,
  revision, declarationHash, harnessHash, trials, warmRepeats: 5, editRepeats: 6,
  machine: { cpu: cpus()[0]?.model, cores: cpus().length, memoryGiB: +(totalmem() / 1024 ** 3).toFixed(1), platform: `${platform()} ${release()}` },
  elapsedMs: performance.now() - started, samples,
};
if (smoke) {
  console.log("Smoke run passed; published reports were not overwritten.");
} else {
  const report = editorReport(record);
  writeFileSync(join(root, "docs/measurements-editor.json"), JSON.stringify(record, null, 2) + "\n");
  writeFileSync(join(root, "docs/measurements-editor.md"), report);
  console.log("Wrote docs/measurements-editor.md and docs/measurements-editor.json");
}
