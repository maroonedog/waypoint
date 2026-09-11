// ===========================================================================
// read-installed-version.ts — what is on disk, not what was asked for.
//
// devDependencies carries a RANGE. Publishing "react-hook-form ^7.87.0" states
// a wish; publishing what node_modules actually holds states what was
// measured, and those stop agreeing the moment anybody reinstalls.
// ===========================================================================
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function readInstalledVersion(packageName: string): string {
  try {
    const manifest = require.resolve(`${packageName}/package.json`);
    const held: unknown = JSON.parse(readFileSync(manifest, "utf8"));
    const version = (held as { version?: unknown }).version;
    return typeof version === "string" ? version : "unknown";
  } catch {
    return "not installed";
  }
}
