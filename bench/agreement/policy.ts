// ===========================================================================
// policy.ts — when a subject claims to have a verdict.
//
// The oracle judges the whole root after every settled change. That is not
// neutral ground truth: it is a sentence-for-sentence description of
// form-contract own policy, and three of the four libraries worth comparing
// ship a different default. Scoring them against this moment would report a
// documented design choice as a defect.
//
// So a subject DECLARES when it claims a verdict, the harness observes it at
// that moment, and the matrix carries five values rather than a pass and a
// fail. A library whose default is on-submit reads `by design`, with the
// citation its own documentation gives, and its counts stay in the table.
// ===========================================================================
import type { ValidationPolicy } from "../subjects/subject.types.ts";
import type { AgreementCell } from "./verdict.types.ts";

export interface PolicyDecision {
  /** Whether the harness should submit before reading the verdict. */
  readonly submitBeforeReading: boolean;
  /** The cell to print when the reading agrees. */
  readonly agreeingCell: AgreementCell;
}

export function decideByPolicy(policy: ValidationPolicy): PolicyDecision {
  switch (policy) {
    case "on-change":
      return { submitBeforeReading: false, agreeingCell: "agrees" };
    case "on-blur":
      return { submitBeforeReading: false, agreeingCell: "agrees" };
    case "on-submit":
      return {
        submitBeforeReading: true,
        agreeingCell: "agrees at submit only",
      };
  }
}

/**
 * What a subject is printed as when its declared policy means it has no
 * verdict at the moment the oracle has one. It is a citation, not a verdict of
 * ours: the library documents this behaviour and a reader can check it.
 */
export const byDesign = (citation: string): string => `by design (${citation})`;
