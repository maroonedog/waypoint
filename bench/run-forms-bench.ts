// ===========================================================================
// run-forms-bench.ts — the counts lane, slice one.
//
// Two subjects, three scenarios, no timing and no CI gate. It exists to
// produce ONE number a sceptic can check, not a broad one they cannot.
//
// Nothing is printed until all six proofs hold. A benchmark that reports a
// figure it could not justify is worse than no benchmark, because the figure
// outlives the caveat.
// ===========================================================================
import "./env/set-production-env.ts";
import { installDevtoolsHook, commitLog } from "./react-work/install-devtools-hook.ts";
import { installJsdom } from "./env/jsdom-environment.ts";

installDevtoolsHook();
const dom = installJsdom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");

const { assertProductionReact } = await import("./env/assert-production-react.ts");
const { describeMachine } = await import("./env/describe-machine.ts");
const { describeReactEnvironment } = await import("./env/describe-react-environment.ts");
const { orderSchema } = await import("./shape/order-schema.ts");
const { countValidatorWork } = await import("./shape/count-validator-work.ts");
const { scenarios } = await import("./agreement/scenarios/index.ts");
const { oracleVerdict } = await import("./agreement/oracle-verdict.ts");
const { compareVerdicts } = await import("./agreement/compare-verdicts.ts");
const { assertOracleIsNotVacuous } = await import("./agreement/assert-oracle-is-not-vacuous.ts");
const { assertSharedSchemaWasReached } = await import("./agreement/assert-shared-schema-was-reached.ts");
const { assertValidatedRootMatches } = await import("./agreement/assert-validated-root-matches.ts");
const { assertSubjectIsLive } = await import("./agreement/assert-subject-is-live.ts");
const { assertDomShapeMatches } = await import("./agreement/assert-dom-shape-matches.ts");
const { assertTreeFibersMatch } = await import("./agreement/assert-tree-fibers-match.ts");
const { measureScenario } = await import("./measure-scenario.ts");
type ScenarioMeasurement = Awaited<
  ReturnType<typeof measureScenario>
>["measurement"];
const { findLosses, orderLossesFirst } = await import("./report/order-losses-first.ts");
const { renderCountsTable, renderEnvironment, NO_MILLISECONDS_NOTICE } =
  await import("./report/render-markdown-tables.ts");
const { formContractUseFieldSubject } = await import("./subjects/form-contract-use-field-subject.ts");
const { handWrittenPerFieldStateSubject } = await import("./subjects/hand-written-per-field-state-subject.ts");
const {
  reactHookFormScopedSubject,
  reactHookFormOnSubmitSubject,
  reactHookFormDepsSubject,
} = await import("./subjects/react-hook-form-scoped-subject.ts");
const { decideByPolicy } = await import("./agreement/policy.ts");
const { readObservableState } = await import("./agreement/read-observable-state.ts");
const { settle } = await import("./react-work/settle.ts");
const { measureWiringOverhead } = await import("./measure-wiring-overhead.ts");

const SUBJECTS = [
  formContractUseFieldSubject,
  handWrittenPerFieldStateSubject,
  reactHookFormScopedSubject,
  reactHookFormDepsSubject,
  reactHookFormOnSubmitSubject,
];

/**
 * The verdict each subject showed, read at the moment its OWN policy claims to
 * have one. Kept apart from the measurement, because a submit driven to read a
 * verdict is an observation and must never be charged to the interaction.
 */
const verdicts = new Map<string, ReturnType<typeof readObservableState>>();
const cells = new Map<string, string>();
const target = { document: dom.document, window: dom.window as never };

// ---- proof: the build under measurement -----------------------------------
const productionProof = assertProductionReact({
  React,
  createRoot,
  container: dom.newContainer(),
  strictModeUsed: false,
});

// ---- proof: the oracle proves something ------------------------------------
const counted = countValidatorWork(orderSchema as unknown as object);
for (const scenario of scenarios) {
  const before = oracleVerdict(orderSchema, []);
  const after = oracleVerdict(
    orderSchema,
    scenario.steps.flatMap((step) =>
      step.kind === "type" ? [{ path: step.path, value: step.value }] : []
    )
  );
  assertOracleIsNotVacuous(scenario, before.state, after.state);
}

// ---- the run ---------------------------------------------------------------
const measurements: ScenarioMeasurement[] = [];
const domShapes = new Map<string, string>();
const trees = new Map<string, { treeFibers: number; wiringFibers: number }>();

// ---- what each subject costs before it holds a single field ----------------
const wiring = new Map<string, number>();
for (const subject of SUBJECTS) {
  const bare = dom.newContainer();
  wiring.set(
    subject.id,
    await measureWiringOverhead(subject, counted.schema, bare)
  );
  bare.remove();
}

// ---- proof: every subject is actually wired up -----------------------------
// On a mount of its own. The canary writes a value, and a value written into a
// scenario is a value the reducer never wrote — the root-match proof would
// then fail every subject for the harness having touched it.
for (const subject of SUBJECTS) {
  const container = dom.newContainer();
  const mounted = subject.mount(container, counted.schema);
  await settle();
  commitLog.clear();
  const before = container.innerHTML;
  await assertSubjectIsLive({
    subjectId: subject.id,
    mounted,
    path: "company.department",
    value: "Canary",
    domChanged: () => container.innerHTML !== before,
    commitsHappened: () => commitLog.commits.length > 0,
    settle,
  });
  mounted.unmount();
  container.remove();
}

for (const subject of SUBJECTS) {
  for (const scenario of scenarios) {
    if (scenario.requires.some((need) => !subject.capabilities.includes(need))) {
      continue;
    }
    counted.reset();
    const container = dom.newContainer();
    const { measurement, mounted } = await measureScenario({
      subject,
      scenario,
      counted,
      container,
      target,
    });

    const oracle = oracleVerdict(
      orderSchema,
      scenario.steps.flatMap((step) =>
        step.kind === "type" ? [{ path: step.path, value: step.value }] : []
      )
    );

    if (scenario.id === scenarios[0]?.id) {
      domShapes.set(subject.id, measurement.domShape);
      trees.set(subject.id, {
        treeFibers: measurement.treeFibers,
        wiringFibers: wiring.get(subject.id) ?? 0,
      });
    }

    // ---- the observation point, after the counters are read ----------------
    // A subject whose policy is on-submit does not validate during a
    // keystroke, by design. So the proofs that it reached the shared schema
    // and judged the same root are applied HERE, at the moment it claims a
    // verdict — applying them after the interaction would fail a library for
    // doing exactly what its documentation says it does.
    const decision = decideByPolicy(subject.policy);
    if (decision.submitBeforeReading) {
      await mounted.submit();
      await settle();
    }
    assertSharedSchemaWasReached(subject.id, scenario.id, counted.work);
    assertValidatedRootMatches(
      subject.id,
      scenario.id,
      counted.work.rootsSeen,
      oracle.root
    );
    const shown = readObservableState(container);
    const comparison = compareVerdicts(subject.id, shown, oracle.state);
    const key = `${subject.id}|${scenario.id}`;
    verdicts.set(key, shown);
    cells.set(key, comparison.agrees ? decision.agreeingCell : "disagrees");

    measurements.push(measurement);
    mounted.unmount();
    container.remove();
  }
}

// ---- proof: the trees are comparable ---------------------------------------
assertDomShapeMatches(domShapes);
assertTreeFibersMatch(trees);

// ---- the report ------------------------------------------------------------
const losses = findLosses(
  measurements,
  formContractUseFieldSubject.id,
  (subjectId, scenarioId) => cells.get(`${subjectId}|${scenarioId}`) ?? "unknown"
);
const ordered = orderLossesFirst(measurements, losses);

// Every disagreement is printed in full. A cell that says "disagrees" and
// nothing else is an accusation; the strings are what let a reader judge it.
const disagreements = ordered.flatMap((measurement) => {
  const key = `${measurement.subjectId}|${measurement.scenarioId}`;
  if (cells.get(key) !== "disagrees") return [];
  const scenario = scenarios.find((one) => one.id === measurement.scenarioId);
  const oracle = oracleVerdict(
    orderSchema,
    (scenario?.steps ?? []).flatMap((step) =>
      step.kind === "type" ? [{ path: step.path, value: step.value }] : []
    )
  );
  const shown = verdicts.get(key);
  if (shown === undefined) return [];
  return compareVerdicts(measurement.subjectId, shown, oracle.state)
    .differences.map(
      (difference) =>
        `- \`${measurement.subjectId}\` / ${measurement.scenarioId} / ` +
        `${difference.channel} at \`${difference.path}\`: subject ` +
        `${JSON.stringify(difference.subject)}, oracle ` +
        `${JSON.stringify(difference.oracle)}`
    );
});

const lines = [
  "# Form runtime comparison — counts lane, slice 1",
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
  "## Counts",
  "",
  "Wiring fibers, measured by mounting each subject with no fields at all: " +
    [...wiring.entries()]
      .map(([id, count]) => `${id} ${count}`)
      .join(", ") +
    ". The trees are compared with these taken out, and the figure is taken " +
    "rather than declared.",
  "",
  losses.length === 0
    ? "form-contract is not behind on any scenario in this slice."
    : `form-contract is behind on ${losses.length} scenario(s); those rows are first:\n\n` +
      losses
        .map(
          (loss) =>
            `- **${loss.scenarioId}**: ${loss.headline} changed fibers against ` +
            `${loss.best} for \`${loss.bestSubjectId}\`, which was scored ` +
            `**${loss.bestAgreement}**`
        )
        .join("\n"),
  "",
  renderCountsTable(
    ordered.map((measurement) => ({
      measurement,
      agreement: (cells.get(
        `${measurement.subjectId}|${measurement.scenarioId}`
      ) ?? "disagrees") as never,
      isSubject: measurement.subjectId === formContractUseFieldSubject.id,
    }))
  ),
  "",
  "## Policies",
  "",
  "Each subject is scored at the moment its OWN policy claims a verdict, and " +
    "the citation is the library documentation rather than our reading of it. " +
    "The on-change policy is form-contract only policy; the default of the " +
    "library it is compared against here is not.",
  "",
  [
    "| subject | policy | documented as | notes |",
    "|---|---|---|---|",
    ...SUBJECTS.map(
      (subject) =>
        `| ${subject.id} | ${subject.policy} | ${subject.policyCitation} | ` +
        `${subject.notes} |`
    ),
  ].join("\n"),
  "",
  "## Disagreements",
  "",
  disagreements.length === 0
    ? "None. Every subject showed what the oracle expected, on every channel."
    : disagreements.join("\n"),
  "",
];

const report = lines.join("\n");
console.log(report);

// Written as well as printed. A number that lives only in a terminal is a
// number nobody can diff against the next run.
const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("docs", { recursive: true });
writeFileSync("docs/measurements-forms.md", `${report}\n`, "utf8");
