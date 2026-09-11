// ===========================================================================
// assert-shared-schema-was-reached.ts — proof 1.
//
// Not reference equality against the shared instance. That is unsatisfiable
// once the instance is wrapped, and it forbids every legitimate adapter shim:
// a library deriving a per-leaf schema, or wrapping safeParse to reshape a
// result, would fail a check it is not doing anything wrong to fail.
//
// What is required instead is that the harness counter ADVANCED during the
// interaction. A subject that reached some other schema, or none, cannot make
// that happen.
// ===========================================================================
import type { ValidatorWork } from "../shape/count-validator-work.ts";

export class SharedSchemaNotReachedError extends Error {
  constructor(subjectId: string, scenarioId: string) {
    super(
      `"${subjectId}" produced no pass through the shared schema during ` +
        `"${scenarioId}". Either it reached a different validator, or it did ` +
        `not validate at all; in both cases its counts are not comparable.`
    );
    this.name = "SharedSchemaNotReachedError";
  }
}

export function assertSharedSchemaWasReached(
  subjectId: string,
  scenarioId: string,
  work: ValidatorWork
): void {
  if (work.passes === 0) {
    throw new SharedSchemaNotReachedError(subjectId, scenarioId);
  }
}
