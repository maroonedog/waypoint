// ===========================================================================
// index.ts — the scripted interactions this lane runs.
//
// Four, and no more, because this slice exists to produce a trustworthy number
// rather than a broad one. K1 is the steady state, K2 the write path, X1 the
// claim that a rule can report against a field nobody touched — and K5 is the
// one arrangement none of the other three can reach.
//
// K5 IS HERE BECAUSE THE DESIGN DOCUMENT ALREADY SAID IT WAS.
// `docs/design/form-benchmark.md` records objection A31 — "No burst typing;
// drain-per-keystroke defeats coalescing" — as "Closed. `K5`", and K5 did not
// exist. This file's header said "Three, and no more", which was honest; the
// objection row was not. Of the three ways out — fix the doc, fix the bench,
// or leave a closed-objection claim standing over a scenario nobody wrote —
// the last is the only one worse than doing nothing, because it is the only
// one a reader cannot detect.
// ===========================================================================
import type { Scenario } from "../scenario.types.ts";

/** A keystroke that changes nothing about the verdict. */
export const k1: Scenario = {
  id: "K1",
  what: "type one character; the verdict does not move",
  requires: [],
  steps: [{ kind: "type", path: "applicant.lastName", value: "LovelaceX" }],
  startsClean: true,
  settlesBetweenSteps: true,
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
  settlesBetweenSteps: true,
  verdictMoves: true,
};

/**
 * Five characters into ONE field with ONE settle at the end — a person typing
 * a word, rather than a harness pressing a key and waiting.
 *
 * The same field and the same steady state as K1, deliberately: beside K1 it
 * reads as "five of these", so the number worth looking at is how far each
 * subject falls short of five times its own K1. A subject that coalesces pays
 * about once; a subject that does not pays five times; and drain-per-keystroke
 * — which is all the other three scenarios do — cannot tell those apart,
 * because it hands every subject its pass per character whether it asked for
 * one or not. The value still moves: the last write wins, so
 * `applicant.lastName` ends at "Lovel" rather than its default, which is how a
 * steady-state scenario proves it did anything at all.
 */
export const k5: Scenario = {
  id: "K5",
  what: "burst of five characters into one field, one settle at the end",
  requires: [],
  steps: [
    { kind: "type", path: "applicant.lastName", value: "L" },
    { kind: "type", path: "applicant.lastName", value: "Lo" },
    { kind: "type", path: "applicant.lastName", value: "Lov" },
    { kind: "type", path: "applicant.lastName", value: "Love" },
    { kind: "type", path: "applicant.lastName", value: "Lovel" },
  ],
  startsClean: true,
  settlesBetweenSteps: false,
  verdictMoves: false,
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
  settlesBetweenSteps: true,
  verdictMoves: true,
};

export const scenarios: readonly Scenario[] = [k1, k2, k5, x1];
