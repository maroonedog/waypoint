// ===========================================================================
// assert-subject-is-live.ts — proof 4, and the one a rigged benchmark fails.
//
// A subscription that was never installed renders correctly on first paint,
// counts zero on every interaction and looks superb. Nothing else in this
// harness would notice.
//
// So one write goes through the library OWN api and two things are required.
// First, the DOM changed OR a commit occurred — OR, not AND: a library that
// writes an uncontrolled input node directly emits no React state at all, and
// an AND rule would disqualify its flagship configuration for working as
// designed. Second, reading back through the library OWN getter returns what
// was written, which no amount of render bookkeeping can fake.
//
// The subject is remounted afterwards so the canary leaves no dirty, touched
// or submit-count residue in the scenario that follows.
// ===========================================================================
import type { MountedSubject } from "../subjects/subject.types.ts";

export class SubjectNotLiveError extends Error {
  constructor(subjectId: string, why: string) {
    super(`"${subjectId}" is not wired up: ${why}`);
    this.name = "SubjectNotLiveError";
  }
}

export interface LivenessProbe {
  readonly subjectId: string;
  readonly mounted: MountedSubject;
  readonly path: string;
  readonly value: string;
  readonly domChanged: () => boolean;
  readonly commitsHappened: () => boolean;
  /**
   * Waited on between the write and the reading. A notification from outside a
   * React event handler schedules a render rather than performing one, so a
   * synchronous check would report every correctly wired subject as dead.
   */
  readonly settle: () => Promise<void>;
}

export async function assertSubjectIsLive(probe: LivenessProbe): Promise<void> {
  probe.mounted.setValue(probe.path, probe.value);
  await probe.settle();

  if (!probe.domChanged() && !probe.commitsHappened()) {
    throw new SubjectNotLiveError(
      probe.subjectId,
      `writing "${probe.path}" through its own api changed neither the DOM ` +
        `nor produced a commit, so nothing is subscribed to anything.`
    );
  }

  const readBack = probe.mounted.readValue(probe.path);
  if (readBack !== probe.value) {
    throw new SubjectNotLiveError(
      probe.subjectId,
      `its own getter returned ${JSON.stringify(readBack)} after writing ` +
        `${JSON.stringify(probe.value)} to "${probe.path}".`
    );
  }
}
