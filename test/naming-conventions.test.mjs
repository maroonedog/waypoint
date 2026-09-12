// The naming rules in CLAUDE.md, enforced rather than described.
//
// A convention written only in a document is one that degrades quietly, which
// is the same argument the store contract makes about itself. So the rule is a
// test, and an exception has to be written into the allowlist below — where a
// reader can see how many there are and why each one is there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SEARCHED = [
  "packages",
  "bench",
  "test",
  "examples",
  "docs-site/src",
  "config",
];

const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".git",
]);

const SEARCHED_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ".astro"];

/** This file, which has to be able to spell the thing it forbids. */
const THE_RULE_ITSELF = fileURLToPath(import.meta.url);

/**
 * An identifier beginning with `check` or `Check` and continuing with a capital
 * — `checkField`, `CheckResult`. It deliberately does not match `checkbox`,
 * `checked`, `checks` or `checkout`, which are whole English words rather than
 * this prefix, nor `readCheckDefinition`, where `Check` is not the start.
 */
const CHECK_PREFIX = /\b(?:check|Check)[A-Z][A-Za-z0-9_]*/g;

/**
 * Names imposed by somebody else's interface. Mirroring a vendor's vocabulary
 * is describing their data, not naming our operation, and renaming it would
 * hide what it corresponds to.
 */
const FOREIGN_NAMES = new Map([
  ["checkDCE", "the React DevTools global hook requires this member by name"],
]);

function* filesUnder(directory) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry)) continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      yield* filesUnder(full);
      continue;
    }
    if (SEARCHED_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      yield full;
    }
  }
}

test("no identifier is spelled with a `check` prefix", () => {
  const found = [];
  for (const directory of SEARCHED) {
    for (const file of filesUnder(join(ROOT, directory))) {
      if (file === THE_RULE_ITSELF) continue;
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, index) => {
        for (const match of line.matchAll(CHECK_PREFIX)) {
          const name = match[0];
          if (FOREIGN_NAMES.has(name)) continue;
          found.push(`${relative(ROOT, file)}:${index + 1}  ${name}`);
        }
      });
    }
  }

  assert.deepEqual(
    found,
    [],
    "`check` names the act and not the answer — a reader cannot tell whether " +
      "it throws, returns a boolean, returns issues, or writes. Name what it " +
      "answers instead (isAncestorPath, sameIssueList, blockingOf). If the " +
      "name comes from somebody else's interface, add it to FOREIGN_NAMES " +
      "with the reason.\n" +
      found.join("\n")
  );
});

test("the allowlist is exercised, so a stale exception is noticed", () => {
  // An exception nobody uses any more is an exception that should be deleted.
  //
  // Excluding this file is the whole test. The allowlist literal below spells
  // every name it allows, so a scan that reads its own source finds each of
  // them in itself and can never fail — which is what the first draft did.
  const everything = SEARCHED.flatMap((directory) =>
    [...filesUnder(join(ROOT, directory))]
      .filter((file) => file !== THE_RULE_ITSELF)
      .map((file) => readFileSync(file, "utf8"))
  ).join("\n");

  for (const [name, why] of FOREIGN_NAMES) {
    assert.ok(
      everything.includes(name),
      `FOREIGN_NAMES still allows "${name}" (${why}) but nothing uses it.`
    );
  }
});
