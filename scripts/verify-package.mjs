import { spawnSync } from "node:child_process";
import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const consumer = await mkdtemp(join(tmpdir(), "waypoint-consumer-"));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script through npm run verify:package or npm run example:quick-start.");

function runNpm(args, cwd, capture = false) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed (${result.status})`);
  return result.stdout;
}

console.log(`Independent consumer: ${consumer}`);
runNpm(["run", "build"], repository);
const packed = JSON.parse(runNpm([
  "pack", "--workspace", "@maroonedog/waypoint", "--pack-destination", consumer, "--json",
], repository, true));
await cp(join(repository, "examples", "quick-start"), consumer, { recursive: true });
runNpm(["install", "./" + packed[0].filename, "--no-audit", "--no-fund"], consumer);
runNpm(["run", "build"], consumer);
runNpm(["test"], consumer);
console.log(`Verified packed package. Sample kept at: ${consumer}`);
if (process.argv.includes("--serve")) runNpm(["run", "dev"], consumer);
