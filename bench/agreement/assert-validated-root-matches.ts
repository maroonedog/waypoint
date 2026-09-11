// ===========================================================================
// assert-validated-root-matches.ts — proof 2.
//
// Every library holds the values in a shape of its own, so the object handed
// to the validator can never be reference-equal to the one the reducer built.
// Deep equality is the useful check: it catches a wrapper that transforms
// values on the way in, which would otherwise surface as phantom errors and a
// fast, broken competitor rather than as a failed assertion.
//
// Only the LAST root submitted is compared. A subject that validates several
// times during one interaction is judged on where it ended up, which is the
// state the DOM is showing.
// ===========================================================================
import { deepStrictEqual } from "node:assert";

export class ValidatedRootMismatchError extends Error {
  constructor(subjectId: string, scenarioId: string, detail: string) {
    super(
      `"${subjectId}" validated a different root than the reducer built in ` +
        `"${scenarioId}". ${detail}`
    );
    this.name = "ValidatedRootMismatchError";
  }
}

export function assertValidatedRootMatches(
  subjectId: string,
  scenarioId: string,
  rootsSeen: readonly unknown[],
  oracleRoot: unknown
): void {
  const last = rootsSeen.at(-1);
  if (last === undefined) {
    throw new ValidatedRootMismatchError(
      subjectId,
      scenarioId,
      "no root reached the validator at all."
    );
  }
  try {
    deepStrictEqual(last, oracleRoot);
  } catch (reason) {
    throw new ValidatedRootMismatchError(
      subjectId,
      scenarioId,
      reason instanceof Error ? reason.message : String(reason)
    );
  }
}
