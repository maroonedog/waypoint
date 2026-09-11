// ===========================================================================
// measure-null-band.ts — this subject against a byte-identical copy of itself.
//
// A null twin per subject PER SIZE RUNG, interleaved through the run rather
// than taken once at the start. Variance scales with work: calibrating every
// verdict on form-contract's self-pair at 31 fields would declare Formik's
// rows at 201 fields "resolved" comfortably inside their own noise.
//
// Null and comparison pair counts are pinned equal, and the band is reported
// as quantiles rather than min-max — a min-max band widens with N, which would
// make the sample count the cheapest knob in the whole design.
// ===========================================================================
import type { Browser } from "playwright-core";
import type { Lane } from "./open-subject-page.ts";
import { takeInterleavedPairs } from "./take-interleaved-pairs.ts";
import { bandOf, round, type Band } from "./statistics.ts";

export interface NullBand {
  readonly subjectId: string;
  readonly shapeId: string;
  readonly band: Band;
  readonly pairs: number;
  readonly skipped: number;
  readonly spreadPercent: number;
}

export async function measureNullBand(request: {
  readonly browser: Browser;
  readonly lanes: readonly [Lane, Lane];
  readonly subjectId: string;
  readonly shapeId: string;
  readonly pairs: number;
  readonly keystrokes: number;
  readonly warmMilliseconds: number;
}): Promise<NullBand> {
  const run = await takeInterleavedPairs({
    browser: request.browser,
    lanes: request.lanes,
    one: { label: `${request.subjectId}#twin-a`, subjectId: request.subjectId },
    other: { label: `${request.subjectId}#twin-b`, subjectId: request.subjectId },
    shapeId: request.shapeId,
    pairs: request.pairs,
    keystrokes: request.keystrokes,
    warmMilliseconds: request.warmMilliseconds,
  });

  const ratios = run.samples
    .map((sample) => sample.ratio)
    .filter((ratio) => Number.isFinite(ratio));
  if (ratios.length === 0) {
    throw new Error(
      `the null twin for ${request.subjectId} produced no usable pair; no ` +
        "resolution can be published for it and so no verdict either"
    );
  }
  const band = bandOf(ratios);
  return {
    subjectId: request.subjectId,
    shapeId: request.shapeId,
    band: { low: round(band.low), middle: round(band.middle), high: round(band.high) },
    pairs: ratios.length,
    skipped: run.skipped,
    spreadPercent: round(((Math.max(...ratios) - Math.min(...ratios)) / band.middle) * 100, 1),
  };
}

/** The band a comparison is judged against: the wider of the two twins'. */
export const widerOf = (one: Band, other: Band): Band => ({
  low: Math.min(one.low, other.low),
  middle: (one.middle + other.middle) / 2,
  high: Math.max(one.high, other.high),
});
