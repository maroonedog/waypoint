// ===========================================================================
// index.ts — the scripted interactions this lane runs.
//
// Three, and no more, because the first slice exists to produce a trustworthy
// number rather than a broad one. K1 is the steady state, K2 the write path,
// and X1 the claim that a rule can report against a field nobody touched.
// ===========================================================================
import type { Scenario } from "../scenario.types.ts";

/** A keystroke that changes nothing about the verdict. */
export const k1: Scenario = {
  id: "K1",
  what: "type one character; the verdict does not move",
  requires: [],
  steps: [{ kind: "type", path: "applicant.lastName", value: "LovelaceX" }],
  startsClean: true,
  verdictMoves: false,
};

/** A keystroke that puts an error on the field it was typed into. */
export const k2: Scenario = {
  id: "K2",
  what: "type a value that makes the typed field itself wrong",
  requires: [],
  steps: [{ kind: "type", path: "applicant.email", value: "ada@" }],
  provingPath: "applicant.email",
  startsClean: true,
  verdictMoves: true,
};

/**
 * A keystroke that puts an error on a DIFFERENT field. The steps write
 * shipping.postcode; the issue has to appear on billing.postcode.
 */
export const x1: Scenario = {
  id: "X1",
  what: "a rule reports against a field the interaction never wrote",
  requires: ["cross-field-error-on-other-path"],
  steps: [{ kind: "type", path: "shipping.postcode", value: "150-0001" }],
  provingPath: "billing.postcode",
  startsClean: true,
  verdictMoves: true,
};

export const scenarios: readonly Scenario[] = [k1, k2, x1];
