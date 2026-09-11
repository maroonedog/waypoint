// ===========================================================================
// run-shape.ts — every subject, every scenario, at one size.
//
// The proofs live here rather than in the report, so a size that cannot be
// measured honestly stops the run instead of producing a table with a footnote
// nobody reads.
// ===========================================================================
import type { Shape } from "./shape/build-shape.ts";
import type { Subject } from "./subjects/subject.types.ts";
import type { Scenario } from "./agreement/scenario.types.ts";
import type { ObservableState } from "./agreement/verdict.types.ts";
import { countValidatorWork } from "./shape/count-validator-work.ts";
import { oracleVerdict } from "./agreement/oracle-verdict.ts";
import { compareVerdicts } from "./agreement/compare-verdicts.ts";
import { assertOracleIsNotVacuous } from "./agreement/assert-oracle-is-not-vacuous.ts";
import { assertSharedSchemaWasReached } from "./agreement/assert-shared-schema-was-reached.ts";
import { assertValidatedRootMatches } from "./agreement/assert-validated-root-matches.ts";
import { assertSubjectIsLive } from "./agreement/assert-subject-is-live.ts";
import { assertDomShapeMatches } from "./agreement/assert-dom-shape-matches.ts";
import { assertTreeFibersMatch } from "./agreement/assert-tree-fibers-match.ts";
import { decideByPolicy } from "./agreement/policy.ts";
import { readObservableState } from "./agreement/read-observable-state.ts";
import { measureScenario, type ScenarioMeasurement } from "./measure-scenario.ts";
import { measureWiringOverhead } from "./measure-wiring-overhead.ts";
import { commitLog } from "./react-work/install-devtools-hook.ts";
import { settle } from "./react-work/settle.ts";
import type { InputTarget } from "./react-work/drive-input.ts";

export interface ShapeRun {
  readonly shapeId: string;
  readonly leaves: number;
  readonly measurements: readonly ScenarioMeasurement[];
  readonly cells: ReadonlyMap<string, string>;
  readonly verdicts: ReadonlyMap<string, ObservableState>;
  readonly wiring: ReadonlyMap<string, number>;
}

export interface ShapeRunRequest {
  readonly shape: Shape;
  readonly subjects: readonly Subject[];
  readonly scenarios: readonly Scenario[];
  readonly target: InputTarget;
  newContainer(): HTMLElement;
}

const editsOf = (scenario: Scenario) =>
  scenario.steps.flatMap((step) =>
    step.kind === "type" ? [{ path: step.path, value: step.value }] : []
  );

export async function runShape(request: ShapeRunRequest): Promise<ShapeRun> {
  const { shape, subjects, scenarios, target, newContainer } = request;
  const counted = countValidatorWork(shape.schema, shape.concretePaths);

  for (const scenario of scenarios) {
    assertOracleIsNotVacuous(
      scenario,
      oracleVerdict(shape, shape.schema as never, []).state,
      oracleVerdict(shape, shape.schema as never, editsOf(scenario)).state
    );
  }

  const context = {
    schema: counted.schema,
    paths: shape.concretePaths,
    defaults: shape.defaults,
  };

  // ---- what each subject costs before it holds a single field --------------
  const wiring = new Map<string, number>();
  for (const subject of subjects) {
    const bare = newContainer();
    wiring.set(
      subject.id,
      await measureWiringOverhead(subject, { ...context, paths: [] }, bare)
    );
    bare.remove();
  }

  // ---- proof: every subject is actually wired up ---------------------------
  // On a mount of its own. The canary writes a value the reducer never wrote,
  // and leaving it inside a scenario fails the root-match proof for every
  // subject the harness has touched.
  for (const subject of subjects) {
    const container = newContainer();
    const mounted = subject.mount(container, context);
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

  const measurements: ScenarioMeasurement[] = [];
  const cells = new Map<string, string>();
  const verdicts = new Map<string, ObservableState>();
  const domShapes = new Map<string, string>();
  const trees = new Map<string, { treeFibers: number; wiringFibers: number }>();

  for (const subject of subjects) {
    for (const scenario of scenarios) {
      if (scenario.requires.some((need) => !subject.capabilities.includes(need))) {
        continue;
      }
      counted.reset();
      const container = newContainer();
      const { measurement, mounted } = await measureScenario({
        subject,
        scenario,
        counted,
        container,
        target,
        context,
      });

      const oracle = oracleVerdict(shape, shape.schema as never, editsOf(scenario));

      if (scenario.id === scenarios[0]?.id && subject.treeClass === "equal-tree") {
        domShapes.set(subject.id, measurement.domShape);
        trees.set(subject.id, {
          treeFibers: measurement.treeFibers,
          wiringFibers: wiring.get(subject.id) ?? 0,
        });
      }

      // ---- the observation point, after the counters are read -------------
      // A subject whose policy is on-submit does not validate during a
      // keystroke, by design, so the proofs that it reached the shared schema
      // and judged the same root are applied at the moment it claims a
      // verdict. Applied after the keystroke they would fail a library for
      // behaving exactly as its documentation says.
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

  assertDomShapeMatches(domShapes);
  assertTreeFibersMatch(trees);

  return {
    shapeId: shape.id,
    leaves: shape.concretePaths.length,
    measurements,
    cells,
    verdicts,
    wiring,
  };
}
