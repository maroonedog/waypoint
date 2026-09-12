// Can this library run on a page that forbids `unsafe-eval`? The only honest
// way to ask is to read the source as text.
//
// No behavioural test can answer it. `new Function` sitting in a branch
// nothing here exercises is still a violation the first time a customer's page
// reaches it, and the suite that never reached it reports a clean run — the
// failure arrives as a blocked script in somebody else's browser, with a stack
// that names a bundle. A policy about what the code MAY CONTAIN has to be
// asserted against the contents.
//
// Two things below are guards on the scan and not on the library, because a
// scan is a test that can pass by finding nothing and looking right while doing
// it. It walks one root, so every entry point is covered by construction —
// `resolver-luq` went unscanned for a while behind a hand-written list of five
// directories that read as exhaustive. And it asserts a floor on the number of
// files it saw, so a scan pointed at a path that no longer exists fails as a
// broken scan instead of reporting that nothing compiles a string.
import { test } from "node:test";
import assert from "node:assert/strict";

// 7 - CSP
test("nothing in the runtime compiles a string", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const sourceFiles = async (directory) => {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) found.push(...(await sourceFiles(full)));
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        found.push(full);
      }
    }
    return found;
  };

  const banned = [/new\s+Function\s*\(/, /(^|[^.\w])eval\s*\(/];
  const offenders = [];
  // One root, so every entry point is covered by construction. Listing the
  // directories by hand is how `resolver-luq` went unscanned while the five
  // that were named looked exhaustive.
  for (const file of await sourceFiles("packages/waypoint/src")) {
    const text = await readFile(file, "utf8");
    if (banned.some((pattern) => pattern.test(text))) offenders.push(file);
  }
  assert.ok(offenders.length === 0, `${offenders.join(", ")} compiles a string`);
  assert.ok(
    (await sourceFiles("packages/waypoint/src")).length > 50,
    "the scan found almost no files — it is pointed somewhere wrong"
  );
});
