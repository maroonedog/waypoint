// ===========================================================================
// measure-scenario.ts — one subject, one scripted interaction, one row.
//
// The order here is the whole discipline. Mount, settle, snapshot the fiber
// tree, and only THEN reset every counter, so nothing a subject does while it
// is starting up is charged to a keystroke. Drive through the DOM. Settle
// again. Read what the document is showing, and read the counters.
//
// Each commit is counted against the tree that preceded IT, not against the
// tree before the interaction: React double-buffers two fiber objects per
// position, so a snapshot more than one commit old reports a legitimately
// reused object as new work.
//
// Nothing in this file knows which library it is measuring.
// ===========================================================================
import type { Scenario } from "./agreement/scenario.types.ts";
import type { MountedSubject, Subject } from "./subjects/subject.types.ts";
import type { CountedSchema } from "./shape/count-validator-work.ts";
import type { ObservableState } from "./agreement/verdict.types.ts";
import { readObservableState } from "./agreement/read-observable-state.ts";
import {
  countFiberVisits,
  sumFiberVisits,
  EMPTY_COMMIT,
} from "./react-work/count-fiber-visits.ts";
import type { CommitSnapshot } from "./react-work/install-devtools-hook.ts";
import { recordDomMutations } from "./react-work/count-dom-mutations.ts";
import { commitLog } from "./react-work/install-devtools-hook.ts";
import { driveBlur, driveInput, type InputTarget } from "./react-work/drive-input.ts";
import { settle } from "./react-work/settle.ts";
import { hashDomShape } from "./agreement/assert-dom-shape-matches.ts";

export interface ScenarioMeasurement {
  readonly subjectId: string;
  readonly scenarioId: string;
  readonly commits: number;
  readonly changedFibers: number;
  readonly changedHostFibers: number;
  readonly treeFibers: number;
  readonly domAttributes: number;
  readonly domChildList: number;
  readonly validatorPasses: number;
  readonly pathsJudged: number;
  readonly validatorMicroseconds: number;
  readonly state: ObservableState;
  readonly rootsSeen: readonly unknown[];
  readonly domShape: string;
}

export interface MeasureRequest {
  readonly subject: Subject;
  readonly scenario: Scenario;
  readonly counted: CountedSchema<object>;
  readonly container: HTMLElement;
  readonly target: InputTarget;
}

export async function measureScenario(request: MeasureRequest): Promise<{
  readonly measurement: ScenarioMeasurement;
  readonly mounted: MountedSubject;
}> {
  const { subject, scenario, counted, container, target } = request;

  const mounted = subject.mount(container, counted.schema);
  await settle();

  // Everything before this line is start-up, and start-up is measured by its
  // own scenario rather than folded into a keystroke.
  const domShape = hashDomShape(container);
  let previous: CommitSnapshot = commitLog.commits.at(-1) ?? EMPTY_COMMIT;
  const treeAtRest = previous.fibers.size;
  commitLog.clear();
  counted.reset();
  const mutations = recordDomMutations(container);

  for (const step of scenario.steps) {
    if (step.kind === "type") driveInput(target, step.path, step.value);
    else driveBlur(target, step.path);
    await settle();
  }
  await settle();

  const dom = mutations.stop();
  const perCommit = commitLog.commits.map((commit) => {
    const counts = countFiberVisits(commit, previous);
    previous = commit;
    return counts;
  });
  const visits = sumFiberVisits(perCommit);

  return {
    mounted,
    measurement: {
      subjectId: subject.id,
      scenarioId: scenario.id,
      commits: commitLog.commits.length,
      changedFibers: visits.changedFibers,
      changedHostFibers: visits.changedHostFibers,
      treeFibers: Math.max(visits.treeFibers, treeAtRest),
      domAttributes: dom.attributes,
      domChildList: dom.childList,
      validatorPasses: counted.work.passes,
      pathsJudged: counted.work.pathsJudged,
      validatorMicroseconds:
        Math.round(Number(counted.work.nanoseconds) / 100) / 10,
      state: readObservableState(container),
      rootsSeen: [...counted.work.rootsSeen],
      domShape,
    },
  };
}
