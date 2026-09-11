// ===========================================================================
// assert-oracle-is-not-vacuous.ts — proof 3.
//
// An oracle that accepts everything agrees with every subject, including one
// that validates nothing at all. So each scenario has to make the oracle
// REJECT something, and the rejected set has to MOVE between the reading
// before the steps and the reading after them.
//
// A scenario declaring startsClean additionally requires zero issues before
// the steps, because zod does not run a root rule once a leaf has failed: a
// run that began invalid would be measuring the short-circuit.
//
// A scenario naming a provingPath requires the issue to land there, which for
// a cross-field scenario is a path no step wrote.
// ===========================================================================
import type { Scenario } from "./scenario.types.ts";
import type { ObservableState } from "./verdict.types.ts";

export class VacuousOracleError extends Error {
  constructor(scenarioId: string, why: string) {
    super(`Scenario "${scenarioId}" proves nothing: ${why}`);
    this.name = "VacuousOracleError";
  }
}

export function assertOracleIsNotVacuous(
  scenario: Scenario,
  before: ObservableState,
  after: ObservableState
): void {
  if (scenario.startsClean && before.messages.size !== 0) {
    throw new VacuousOracleError(
      scenario.id,
      `the root was already rejected before the steps ran ` +
        `(${[...before.messages.keys()].join(", ")}), so the run would be ` +
        `measuring the short-circuit.`
    );
  }

  const beforePaths = [...before.messages.keys()].sort().join("|");
  const afterPaths = [...after.messages.keys()].sort().join("|");

  if (scenario.verdictMoves) {
    if (beforePaths === afterPaths) {
      throw new VacuousOracleError(
        scenario.id,
        "the set of rejected paths did not move, so every subject agrees by " +
          "doing nothing."
      );
    }
  } else {
    // A steady-state scenario proves itself through the value channel: the
    // edit has to be observable somewhere, or the run measures an event that
    // changed nothing anywhere.
    const moved = [...after.values.entries()].some(
      ([path, held]) => before.values.get(path) !== held
    );
    if (!moved) {
      throw new VacuousOracleError(
        scenario.id,
        "no value moved, so the steps did not do anything at all."
      );
    }
    if (beforePaths !== afterPaths) {
      throw new VacuousOracleError(
        scenario.id,
        "it is declared steady-state but the verdict moved from " +
          `[${beforePaths}] to [${afterPaths}].`
      );
    }
  }

  const proving = scenario.provingPath;
  if (proving !== undefined && !after.messages.has(proving)) {
    throw new VacuousOracleError(
      scenario.id,
      `nothing was reported on "${proving}", which is the path the scenario ` +
        `exists to reach.`
    );
  }

  if (proving !== undefined) {
    const written = new Set(
      scenario.steps
        .filter((step): step is { kind: "type"; path: string; value: string } =>
          step.kind === "type"
        )
        .map((step) => step.path)
    );
    if (scenario.requires.includes("cross-field-error-on-other-path") &&
        written.has(proving)) {
      throw new VacuousOracleError(
        scenario.id,
        `"${proving}" is a path the steps write, so it does not test whether ` +
          `a rule can report against a field nobody touched.`
      );
    }
  }
}
