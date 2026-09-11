// ===========================================================================
// summarise-samples.ts — faster, slower, or the word this harness exists for.
//
// The statistic is median(perPairRatios), never the ratio of two medians: the
// second one throws away the pairing, which is the only thing making the
// samples comparable in the first place.
//
// A difference earns the right to be called real when its band (a) does not
// overlap the null band — this subject against a byte-identical twin, at this
// same size — and (b) is larger than the smallest injected cost the harness
// could actually resolve at the scheduling position the metric can see.
// Otherwise the verdict is `indistinguishable` and the report prints that
// word. A harness whose resolution is published cannot round 6% into a win.
// ===========================================================================
import type { PairRun } from "./take-interleaved-pairs.ts";
import { summariseSide, type SideSummary } from "./summarise-side.ts";
import {
  bandOf,
  bandsOverlap,
  relativeSpreadPercent,
  round,
  type Band,
} from "./statistics.ts";

export type TimeVerdict = "faster" | "slower" | "indistinguishable";
export type { SideSummary };

export interface Summary {
  readonly shapeId: string;
  readonly one: SideSummary;
  readonly other: SideSummary;
  readonly band: Band;
  readonly ratioLow: number;
  readonly ratioHigh: number;
  readonly relativeSpreadPercent: number;
  readonly pairs: number;
  /** Pairs whose trace could not be cut. Published, never quietly absent. */
  readonly skipped: number;
  readonly differenceMicroseconds: number;
  readonly verdict: TimeVerdict;
  readonly why: string;
}

export interface Resolution {
  /** This subject pair against its own twin, at this same size. */
  readonly nullBand: Band;
  /** The smallest injected cost resolved at the position the metric sees. */
  readonly smallestResolvedMicroseconds: number;
  /** False when the ladder was skipped, which forbids a verdict outright. */
  readonly ladderWasRun: boolean;
}

export function summariseSamples(run: PairRun, resolution: Resolution): Summary {
  const ratios = run.samples
    .map((sample) => sample.ratio)
    .filter((ratio) => Number.isFinite(ratio));
  const raw = bandOf(ratios);
  const band: Band = {
    low: round(raw.low),
    middle: round(raw.middle),
    high: round(raw.high),
  };
  const one = summariseSide(run.one.label, run, "one");
  const other = summariseSide(run.other.label, run, "other");
  const difference = one.inputHandlerMicroseconds - other.inputHandlerMicroseconds;

  const overlapsNull = bandsOverlap(band, resolution.nullBand);
  const belowLadder =
    Math.abs(difference) < resolution.smallestResolvedMicroseconds;

  // A subject cannot earn `faster` on a metric that cannot see its work.
  // The ladder establishes that a cost deferred to a microtask is invisible
  // here — nothing up to 4 ms was ever resolved at that position — and this
  // harness separately COUNTS how many of a subject's validation passes ran
  // inside the dispatch. When that share is below 1 and the subject did
  // validator work at all, a smaller handler figure is partly a statement
  // about where the work was scheduled rather than about how much there was.
  //
  // The test is deliberately one-sided. Being slower WHILE deferring work out
  // of the measured window is a finding the deferral cannot explain away, so
  // that direction still stands. And a subject that did no validator work at
  // all is not deferring anything — react-hook-form in its on-submit mode does
  // nothing per keystroke by documented design, and that is a policy its own
  // column reports, not an artefact this rule should hide.
  const defersUnseenWork =
    one.insideDispatchShare < 1 && one.validatorMicroseconds > 0;

  const verdict: TimeVerdict =
    overlapsNull || belowLadder
      ? "indistinguishable"
      : band.middle > 1
        ? "slower"
        : defersUnseenWork
          ? "indistinguishable"
          : "faster";

  const why = overlapsNull
    ? `the band ${band.low}–${band.high} overlaps the null band ` +
      `${round(resolution.nullBand.low)}–${round(resolution.nullBand.high)}`
    : verdict === "indistinguishable" && defersUnseenWork
      ? `only ${Math.round(one.insideDispatchShare * 100)}% of its ` +
        `${one.validatorMicroseconds} µs of validator work per keystroke ran ` +
        "inside the dispatch this metric measures, and the ladder resolves " +
        "nothing at all at the microtask position; a smaller handler figure " +
        "here is partly about where the work was scheduled"
    : !resolution.ladderWasRun
      ? "the calibration ladder was not run, so this harness has published no " +
        "resolution and is not entitled to a verdict"
      : belowLadder
        ? `${round(Math.abs(difference), 1)} µs is under the smallest cost this ` +
          `harness resolved (${round(resolution.smallestResolvedMicroseconds, 1)} µs)`
        : "the band clears both the null band and the calibration floor";

  return {
    shapeId: run.shapeId,
    one,
    other,
    band,
    ratioLow: round(Math.min(...ratios)),
    ratioHigh: round(Math.max(...ratios)),
    relativeSpreadPercent: relativeSpreadPercent(ratios),
    pairs: ratios.length,
    skipped: run.skipped,
    differenceMicroseconds: round(difference, 1),
    verdict,
    why,
  };
}
