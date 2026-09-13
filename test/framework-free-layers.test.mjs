// Three of this package's source layers claim to name no framework:
// `src/contract`, `src/core` and `src/dom`. Until now that claim was enforced
// by nothing.
//
// `"types": []` was the thing people assumed enforced it. It does not — it
// suppresses AMBIENT @types, and an explicit `import type { ReactNode } from
// "react"` compiles green underneath it. What IS enforced by tsc is the other
// half of core's claim, that it names no DOM: `lib: ["ES2020"]` with no `DOM`
// rejects `HTMLInputElement` outright. So the DOM half is checked by the
// compiler and the framework half was checked by nobody, which is the hole
// this file fills — and it is the hole `src/dom` would have inherited on the
// day it was created.
//
// The rule is stricter than "no react": a source file in these three layers
// may only import from a RELATIVE path. That is what they already do, it needs
// no list of framework names to be kept up to date, and it fails on the second
// framework as readily as on the first.
//
// The floor on the file count is a guard on the scan rather than on the
// library. A scan pointed at a directory that no longer exists finds no
// offenders and reports a clean run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = fileURLToPath(
  new URL("../packages/waypoint/src/", import.meta.url)
);

/** The layers that are sold on naming no framework. */
const FRAMEWORK_FREE = ["contract", "core", "dom"];

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      yield* sourceFiles(full);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      yield full;
    }
  }
}

/** `from "x"`, `import "x"` and `require("x")`, in one pass. */
const SPECIFIERS =
  /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

test("nothing in the framework-free layers imports a package", () => {
  const offenders = [];
  let seen = 0;
  for (const layer of FRAMEWORK_FREE) {
    for (const file of sourceFiles(join(SOURCE, layer))) {
      seen += 1;
      const text = readFileSync(file, "utf8");
      for (const [, specifier] of text.matchAll(SPECIFIERS)) {
        if (specifier.startsWith(".")) continue;
        offenders.push(`${file} imports "${specifier}"`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a framework-free layer reached outside itself"
  );
  assert.ok(
    seen > 40,
    `the scan saw ${seen} files — it is pointed somewhere wrong`
  );
});
