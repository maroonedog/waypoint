// ===========================================================================
// run-forms-bench.ts — the counts lane.
//
// Eight subjects across three sizes, counts only, no timing. Nothing is printed
// until every proof holds: a benchmark that reports a figure it could not
// justify is worse than no benchmark, because the figure outlives the caveat.
//
// With `--check` it compares against the recorded baseline and exits non-zero
// on drift, which is what makes the numbers a gate rather than a blog post.
// ===========================================================================
import "./env/set-production-env.ts";
import { installDevtoolsHook } from "./react-work/install-devtools-hook.ts";
import { installJsdom } from "./env/jsdom-environment.ts";

installDevtoolsHook();
const dom = installJsdom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");

const { assertProductionReact } = await import("./env/assert-production-react.ts");
const { describeMachine } = await import("./env/describe-machine.ts");
const { describeReactEnvironment } = await import("./env/describe-react-environment.ts");
const { SHAPES } = await import("./shape/build-shape.ts");
const { scenarios } = await import("./agreement/scenarios/index.ts");
const { runShape } = await import("./run-shape.ts");
const { findLosses, orderLossesFirst } = await import("./report/order-losses-first.ts");
const { renderCountsTable, renderEnvironment, NO_MILLISECONDS_NOTICE } =
  await import("./report/render-markdown-tables.ts");
const { readBaseline, toBaseline, compareBaseline, writeBaseline } =
  await import("./report/baseline.ts");
// The SAME list the browser lane mounts. Dynamically, because this import
// pulls react-dom in and the devtools hook above only sees commits from a
// react-dom that loaded after it.
const { SUBJECTS } = await import("./subjects/subject-registry.ts");
const { PRIMARY } = await import("./subjects/subject-ids.ts");

const target = { document: dom.document, window: dom.window as never };
const checking = process.argv.includes("--check");

// ---- proof: the build under measurement ------------------------------------
const productionProof = assertProductionReact({
  React,
  createRoot,
  container: dom.newContainer(),
  strictModeUsed: false,
});

// ---- the run ---------------------------------------------------------------
const runs = [];
for (const shape of SHAPES) {
  runs.push(
    await runShape({
      shape,
      subjects: SUBJECTS,
      scenarios,
      target,
      newContainer: () => dom.newContainer(),
    })
  );
}

// ---- the report ------------------------------------------------------------
const sections: string[] = [
  "# Form runtime comparison — counts lane",
  "",
  NO_MILLISECONDS_NOTICE,
  "",
  "## What was measured on",
  "",
  renderEnvironment(
    { ...describeMachine(), ...productionProof },
    describeReactEnvironment()
  ),
  "",
  "## Policies",
  "",
  "Each subject is scored at the moment its OWN policy claims a verdict, and " +
    "the citation is the library documentation rather than our reading of it. " +
    "The on-change policy is the only policy form-contract has; the default " +
    "of three of the libraries beside it is not.",
  "",
  [
    "| subject | library | policy | documented as | notes |",
    "|---|---|---|---|---|",
    ...SUBJECTS.map(
      (subject) =>
        `| ${subject.id} | ${subject.library} | ${subject.policy} | ` +
        `${subject.policyCitation} | ${subject.notes} |`
    ),
  ].join("\n"),
];

for (const run of runs) {
  const losses = findLosses(
    run.measurements,
    PRIMARY,
    (subjectId, scenarioId) =>
      run.cells.get(`${subjectId}|${scenarioId}`) ?? "unknown"
  );
  const ordered = orderLossesFirst(run.measurements, losses);

  const disagreements = ordered.flatMap((measurement) => {
    const key = `${measurement.subjectId}|${measurement.scenarioId}`;
    if (run.cells.get(key) !== "disagrees") return [];
    const shown = run.verdicts.get(key);
    if (shown === undefined) return [];
    return [...shown.messages.entries()].length === 0
      ? [`- \`${measurement.subjectId}\` / ${measurement.scenarioId}: showed no message`]
      : [
          `- \`${measurement.subjectId}\` / ${measurement.scenarioId}: showed ` +
            [...shown.messages.entries()]
              .map(([path, text]) => `${path}=${JSON.stringify(text.slice(0, 200))}`)
              .join(", "),
        ];
  });

  sections.push(
    "",
    `## ${run.shapeId} — ${run.leaves} rendered fields`,
    "",
    "Wiring fibers, measured by mounting each subject with no fields at all: " +
      [...run.wiring.entries()].map(([id, count]) => `${id} ${count}`).join(", ") +
      ". The trees are compared with these taken out, and the figure is taken " +
      "rather than declared.",
    "",
    losses.length === 0
      ? "form-contract is not behind any subject at this size."
      : `form-contract is behind on ${losses.length} scenario(s); those rows are first:\n\n` +
        losses
          .map(
            (loss) =>
              `- **${loss.scenarioId}**: ${loss.headline} changed fibers ` +
              `against ${loss.best} for \`${loss.bestSubjectId}\`, which was ` +
              `scored **${loss.bestAgreement}**`
          )
          .join("\n"),
    "",
    renderCountsTable(
      ordered.map((measurement) => ({
        measurement,
        agreement: (run.cells.get(
          `${measurement.subjectId}|${measurement.scenarioId}`
        ) ?? "disagrees") as never,
        isSubject: measurement.subjectId === PRIMARY,
      }))
    ),
    "",
    "### Disagreements",
    "",
    disagreements.length === 0
      ? "None at this size."
      : disagreements.join("\n")
  );
}

const report = `${sections.join("\n")}\n`;
const taken = toBaseline(runs);

if (checking) {
  const recorded = readBaseline();
  const drift = compareBaseline(recorded, taken);
  if (drift.length > 0) {
    console.error("The counts moved against the recorded baseline:\n");
    for (const line of drift) console.error(`  ${line}`);
    console.error(
      "\nIf the change is intended, rerun without --check to record it and " +
        "explain the difference in the commit."
    );
    process.exit(1);
  }
  console.log("The counts match the recorded baseline.");
} else {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/measurements-forms.md", report, "utf8");
  writeBaseline(taken);
  console.log(report);
}
