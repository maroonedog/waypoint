// ===========================================================================
// render-time-tables.ts — resolution above results, evidence beside claims.
//
// §0 is what this harness can see, and it is printed BEFORE anything it saw,
// because a reader who meets the numbers first has already formed an opinion
// by the time the caveat arrives.
//
// Absolute microseconds are published beside every ratio: a ratio without an
// absolute removes the one number a reader can hold against a 16 ms frame
// budget.
// ===========================================================================
import type { TimeLaneResult } from "../browser/lane-time.ts";
import type { Summary } from "../browser/summarise-samples.ts";
import { DENOMINATOR } from "../subjects/subject-ids.ts";
import { LADDER_MILLISECONDS, POSITIONS } from "../browser/measure-calibration-ladder.ts";
import { code, table } from "./markdown-table.ts";

export function renderResolution(result: TimeLaneResult): string {
  const ladder = result.ladder;
  if (ladder === undefined) {
    return (
      "**The calibration ladder was not run.** This harness has therefore " +
      "published no resolution, and every verdict below reads " +
      "`indistinguishable` on that ground alone."
    );
  }

  const rows = LADDER_MILLISECONDS.map((milliseconds) => [
    `${milliseconds} ms`,
    ...POSITIONS.map((position) => {
      const rung = ladder.rungs.find(
        (held) =>
          held.position === position && held.injectedMilliseconds === milliseconds
      );
      if (rung === undefined) return "—";
      const shown = `${rung.observedMicroseconds} µs, ratio ${rung.band.middle}`;
      return `${rung.resolved ? "**resolved**" : "not resolved"} (${shown})`;
    }),
  ]);

  const sentence = POSITIONS.map((position) => {
    const anyResolved = ladder.rungs.some(
      (rung) => rung.position === position && rung.resolved
    );
    const smallest = (ladder.smallestResolved[position] ?? 0) / 1000;
    return anyResolved
      ? `${smallest} ms at the ${position} position`
      : `nothing at all up to ${LADDER_MILLISECONDS.at(-1)} ms at the ${position} position`;
  }).join(", ");

  return [
    `Injected into ${code(ladder.subjectId)} at ${code(ladder.shapeId)}, judged ` +
      "against the 0 ms rung's own band by the same rule the comparisons use.",
    "",
    table(["injected", ...POSITIONS], rows),
    "",
    `**This harness sees ${sentence}.**`,
    "",
    "The headline metric is `EventDispatch` filtered to `input`, and that " +
      "event closes before a microtask runs. A runtime that defers its work — " +
      "waypoint coalesces its validation pass to a microtask — is " +
      "therefore cheap on this metric BY CONSTRUCTION, and the microtask and " +
      "macrotask columns above are the measurement that says so rather than an " +
      "argument that it might be true.",
  ].join("\n");
}

export function renderNullBands(result: TimeLaneResult): string {
  const rows = result.rungs.flatMap((rung) =>
    rung.nulls.map((held) => [
      rung.shapeId,
      code(held.subjectId),
      String(held.band.low),
      String(held.band.middle),
      String(held.band.high),
      String(held.pairs),
      String(held.skipped),
      `${held.spreadPercent}%`,
    ])
  );
  return table(
    ["shape", "subject", "p10", "median", "p90", "pairs", "dropped", "spread"],
    rows
  );
}

/**
 * The sentence that keeps a deferral from reading as a win. A subject whose
 * pass runs outside the dispatch has work this metric cannot see — the
 * calibration ladder resolved NOTHING up to 4 ms at the microtask position —
 * and its handler figure is smaller for that reason as well as any other.
 */
const deferralCaveat = (summaries: readonly Summary[]): readonly string[] => {
  const deferring = summaries.filter(
    (summary) =>
      summary.one.insideDispatchShare < 1 && summary.one.validatorMicroseconds > 0
  );
  if (deferring.length === 0) return [];
  return [
    "**Read the deferring rows with the ladder in hand.** " +
      deferring
        .map(
          (summary) =>
            `${code(summary.one.label)} ran ${summary.one.validatorPasses} pass(es) ` +
            `per keystroke, ${summary.one.validatorMicroseconds} µs of them, with ` +
            `${Math.round(summary.one.insideDispatchShare * 100)}% inside the dispatch`
        )
        .join("; ") +
      ". That work is real and it is not in the input-handler figure, because " +
      "this harness's own ladder shows the metric cannot resolve a cost at the " +
      "microtask position at all. The counts lane is where that work is " +
      "counted rather than timed.",
  ];
};

export function renderComparisons(result: TimeLaneResult): string {
  const policyOf = (id: string): string =>
    result.subjects.find((subject) => subject.id === id)?.policy ?? "unknown";

  return result.rungs
    .map((rung) => {
      const ordered = [...rung.comparisons].sort(
        (one, other) => other.band.middle - one.band.middle
      );
      const rows = ordered.map((summary) => [
        code(summary.one.label),
        policyOf(summary.one.label),
        `${summary.band.middle} (${summary.band.low}–${summary.band.high})`,
        `${summary.one.inputHandlerMicroseconds} µs`,
        `${summary.other.inputHandlerMicroseconds} µs`,
        `${summary.one.validatorMicroseconds} µs`,
        `${Math.round(summary.one.insideDispatchShare * 100)}%`,
        // Not a judgement call: the harness counted how many passes ran inside
        // the input dispatch. Where none did, the validator time is not part
        // of the handler figure, and subtracting it would invent a number
        // rather than report a small one.
        summary.one.insideDispatchShare < 1 || summary.one.runtimeMicroseconds < 0
          ? "n/a — the pass is outside the dispatch"
          : `${summary.one.runtimeMicroseconds} µs`,
        `${summary.ratioLow}–${summary.ratioHigh}`,
        `${summary.pairs} / ${summary.skipped}`,
        `${summary.relativeSpreadPercent}%`,
        `**${summary.verdict}**`,
      ]);
      return [
        `### ${rung.shapeId} — ${rung.leaves} rendered fields`,
        "",
        `Ratios are ${code(`subject ÷ ${DENOMINATOR}`)}, above 1 meaning slower. ` +
          "The statistic is the median of the PER-PAIR ratios, never the ratio " +
          "of two medians. Spread is peak-to-peak over the median and is an " +
          "upper bound on disturbance, not a confidence interval.",
        "",
        "The policy column is not decoration. A subject whose policy is " +
          "on-submit does no validation during a keystroke BY DESIGN: its " +
          "validator column reads 0 µs and its row is cheap for a documented " +
          "design reason rather than for a performance one.",
        "",
        "`of which validator` is per keystroke, taken by the harness-owned " +
          "schema wrapper — the same wrapper that produces `validatorPasses` " +
          "in the counts lane. `runtime` is `input handler − validator` and is " +
          "a SUBTRACTION, not a measurement. It is only meaningful where the " +
          "validation pass runs inside the dispatch: waypoint coalesces " +
          "its pass to a microtask and react-hook-form's resolver is " +
          "promise-based. Which of them is which is MEASURED, not assumed: " +
          "the harness counts how many passes ran while the input event was " +
          "being dispatched, and that share is the column beside it. Below " +
          "100%, the subtraction would invent a number and the cell says so.",
        "",
        table(
          [
            "subject",
            "policy",
            "ratio (p10–p90)",
            "input handler",
            "denominator",
            "of which validator",
            "inside the dispatch",
            "runtime (a subtraction)",
            "full range",
            "pairs / dropped",
            "spread",
            "verdict",
          ],
          rows
        ),
        "",
        ...ordered
          .filter((summary) => summary.verdict === "indistinguishable")
          .map((summary) => `- ${code(summary.one.label)}: ${summary.why}`),
        "",
        ...deferralCaveat(ordered),
      ].join("\n");
    })
    .join("\n\n");
}

