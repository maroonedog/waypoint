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
// THE SECOND TEST IS THE OTHER HALF OF THE SAME RULE, and it became askable
// only when a second binding existed: `src/react` and `src/vue` may each name
// their own framework and nothing else. Without it, the shared layer is
// policed and the bindings are not, and the seam holds only while everybody
// remembers which directory they are in.
//
// The floors on the file counts are guards on the scans rather than on the
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

/**
 * Comments are removed before the scan, and that is a correction rather than
 * tidiness: this repository's comments are prose, and prose contains the word
 * "from" in front of a quoted phrase. `use-coverage-report.ts` says the runtime
 * cannot tell "not yet" from "never", which the pattern above reads as an
 * import of a package called `never` — a failure that names a real file and a
 * rule nobody broke, which is the worst kind a scan can produce.
 */
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

test("nothing in the framework-free layers imports a package", () => {
  const offenders = [];
  let seen = 0;
  for (const layer of FRAMEWORK_FREE) {
    for (const file of sourceFiles(join(SOURCE, layer))) {
      seen += 1;
      const text = withoutComments(readFileSync(file, "utf8"));
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

/**
 * The other half of the same rule, which only became askable when there were
 * two bindings: a binding layer may name ITS OWN framework and no other.
 *
 * The failure it is aimed at is a quiet one. Nothing stops a Vue file
 * importing `useSyncExternalStore` to save a few lines — it compiles, it runs
 * under a test that renders with Vue, and it puts React in the dependency
 * graph of every Vue application that installs this package. The reverse costs
 * the same and reads the same. What each binding may reach for outside itself
 * is one package, and the list below is short enough to keep honest.
 */
const BINDINGS = new Map([
  ["react", "react"],
  ["vue", "vue"],
]);

test("a binding layer names its own framework and no other", () => {
  const offenders = [];
  for (const [layer, allowed] of BINDINGS) {
    for (const file of sourceFiles(join(SOURCE, layer))) {
      const text = withoutComments(readFileSync(file, "utf8"));
      for (const [, specifier] of text.matchAll(SPECIFIERS)) {
        if (specifier.startsWith(".")) continue;
        if (specifier === allowed || specifier.startsWith(`${allowed}/`)) {
          continue;
        }
        offenders.push(`src/${layer}: ${file} imports "${specifier}"`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a binding reached for a package that is not its own framework"
  );
  for (const layer of BINDINGS.keys()) {
    const named = [...sourceFiles(join(SOURCE, layer))].filter((file) =>
      withoutComments(readFileSync(file, "utf8")).includes(`from "${BINDINGS.get(layer)}"`)
    );
    assert.ok(
      named.length > 0,
      `no file under src/${layer} names ${BINDINGS.get(layer)} — the scan is pointed somewhere wrong`
    );
  }
});
