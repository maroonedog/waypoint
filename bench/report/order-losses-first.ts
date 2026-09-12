// ===========================================================================
// order-losses-first.ts — where form-contract is behind, at the top.
//
// A benchmark whose author sorts their own row to the top is asking to be
// disbelieved. Rows are grouped by scenario, and within a scenario the rows
// where form-contract is behind another subject on the headline count are
// printed first.
//
// A loss is identified by ROW IDENTITY, not by how many there are. A loss that
// disappears between runs is a change worth explaining, and counting them
// would let one appear as another vanished.
// ===========================================================================
import type { ScenarioMeasurement } from "../measure-scenario.ts";

const HEADLINE = (measurement: ScenarioMeasurement): number =>
  measurement.changedFibers;

export interface LossRow {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly headline: number;
  readonly bestSubjectId: string;
  readonly best: number;
  /** What the cheaper subject was scored as. A cheap row that disagreed is
   *  still a loss, and printing the number without this word beside it would
   *  be misleading in the other direction. */
  readonly bestAgreement: string;
}

/** Every scenario where the named subject is not the cheapest on the count. */
export function findLosses(
  measurements: readonly ScenarioMeasurement[],
  subjectId: string,
  agreementOf: (subjectId: string, scenarioId: string) => string
): readonly LossRow[] {
  const byScenario = new Map<string, ScenarioMeasurement[]>();
  for (const measurement of measurements) {
    const held = byScenario.get(measurement.scenarioId);
    if (held === undefined) byScenario.set(measurement.scenarioId, [measurement]);
    else held.push(measurement);
  }

  const losses: LossRow[] = [];
  for (const [scenarioId, group] of byScenario) {
    const ours = group.find((one) => one.subjectId === subjectId);
    if (ours === undefined) continue;
    let best = ours;
    for (const one of group) if (HEADLINE(one) < HEADLINE(best)) best = one;
    if (best.subjectId !== subjectId) {
      losses.push({
        scenarioId,
        subjectId,
        headline: HEADLINE(mine),
        bestSubjectId: best.subjectId,
        best: HEADLINE(best),
        bestAgreement: agreementOf(best.subjectId, scenarioId),
      });
    }
  }
  return losses;
}

/** Losing scenarios first, then the rest, each group in scenario order. */
export function orderLossesFirst(
  measurements: readonly ScenarioMeasurement[],
  losses: readonly LossRow[]
): readonly ScenarioMeasurement[] {
  const losing = new Set(losses.map((loss) => loss.scenarioId));
  const rank = (one: ScenarioMeasurement): number =>
    losing.has(one.scenarioId) ? 0 : 1;
  return [...measurements].sort(
    (one, other) =>
      rank(one) - rank(other) ||
      one.scenarioId.localeCompare(other.scenarioId) ||
      one.subjectId.localeCompare(other.subjectId)
  );
}
