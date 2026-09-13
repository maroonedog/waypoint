// ===========================================================================
// run-mutations.ts — every behaviour this suite claims to pin, unpinned once.
//
// A test that passes proves the code does something. It does not prove the
// test would notice if the code stopped. This repository has been writing
// tests whose comments argue at length for a behaviour, and the only way to
// know an argument is load-bearing is to take the behaviour away and watch the
// argument fail. That was being done by hand, once, at the moment each thing
// was written — which pins it for that afternoon and nothing after.
//
// SO IT IS A RECORDED LIST AND NOT A SWEEP. Off-the-shelf mutation testing
// mutates everything and reports a score, which answers "how much of this is
// tested" — a question the coverage of a suite already half answers. What is
// asked here is narrower and harder: for each behaviour somebody wrote a
// paragraph about, WHICH test fails when it goes? A score cannot say that, and
// a named pair can.
//
// APPLIED TO `dist`, WHICH LOOKS WRONG AND IS THE ONLY THING THAT WORKS. The
// tests import `@maroonedog/waypoint/react`, and the exports map sends that to
// the built output — so a mutation in `src` changes nothing a test can see
// until a build has run, and a build per mutation is minutes of tsc to learn
// what one string replacement already knows. The build is a type strip and a
// module rewrite, so the line a mutation names exists in both; when it stops
// existing in dist, this refuses to run rather than reporting a pass, and that
// refusal is how the record is kept honest.
//
// THE FILE IS RESTORED IN A `finally`, from a copy taken before the write. A
// crashed run that left a mutated dist behind would make every later run in
// that checkout meaningless, and dist is not in git to notice it.
// ===========================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface Mutation {
  readonly id: string;
  readonly file: string;
  readonly find: string;
  readonly replace: string;
  readonly test: string;
  /** The test that must fail, or `"*"` for "any test in that file". */
  readonly catches: string;
  readonly why: string;
}

const at = (relative: string): string =>
  fileURLToPath(new URL(relative, import.meta.url));

const record = JSON.parse(
  readFileSync(at("../config/mutations.json"), "utf8")
) as { readonly mutations: readonly Mutation[] };

const distOf = (file: string): string =>
  at(`../packages/waypoint/dist/${file}`);

/** @returns the names of the tests that failed, or an empty list. */
function runTests(file: string): readonly string[] {
  const outcome = spawnSync(
    process.execPath,
    [
      "--test",
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      file,
    ],
    { cwd: at(".."), encoding: "utf8", maxBuffer: 1 << 26 }
  );
  const printed = `${outcome.stdout}${outcome.stderr}`;
  const failed: string[] = [];
  for (const line of printed.split(/\r?\n/)) {
    const named = /^\s*(?:not ok \d+ -|✖)\s+(.*?)(?:\s+\(\d.*\))?$/.exec(line);
    if (named?.[1] !== undefined && named[1] !== "failing tests:") {
      failed.push(named[1].trim());
    }
  }
  return [...new Set(failed)];
}

const say = (line: string): void => process.stdout.write(`${line}\n`);

let survived = 0;
let missing = 0;

say(`${record.mutations.length} behaviours, each taken away once.\n`);

for (const mutation of record.mutations) {
  const path = distOf(mutation.file);
  const before = readFileSync(path, "utf8");
  if (!before.includes(mutation.find)) {
    say(`MISSING  ${mutation.id.padEnd(26)} the line it names is not in ${mutation.file}`);
    missing += 1;
    continue;
  }
  let failures: readonly string[] = [];
  try {
    writeFileSync(path, before.split(mutation.find).join(mutation.replace));
    failures = runTests(mutation.test);
  } finally {
    writeFileSync(path, before);
  }

  const wanted = mutation.catches;
  const caught =
    wanted === "*"
      ? failures.length > 0
      : failures.some((one) => one.includes(wanted));
  if (caught) {
    say(`caught   ${mutation.id.padEnd(26)} ${mutation.test}`);
    continue;
  }
  survived += 1;
  say(`SURVIVED ${mutation.id.padEnd(26)} ${mutation.why}`);
  say(
    failures.length === 0
      ? `         nothing failed in ${mutation.test}`
      : `         ${failures.length} failed, none of them "${wanted}"`
  );
}

say("");
if (missing > 0 || survived > 0) {
  say(
    `${survived} behaviour(s) nothing noticed, ${missing} line(s) the record names and dist does not have.`
  );
  process.exitCode = 1;
} else {
  say("Every behaviour in the record has a test that fails without it.");
}
