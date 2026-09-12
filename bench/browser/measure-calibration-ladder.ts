// ===========================================================================
// measure-calibration-ladder.ts — a known cost, and whether we could see it.
//
// Seven rungs at THREE scheduling positions. The third one is the point:
// waypoint defers its validation pass to a microtask, and the headline
// metric is EventDispatch filtered to `input`, which closes before a microtask
// runs. A synchronous-only ladder would prove resolution for the one cost
// shape the metric already sees best, and then be quoted as though it proved
// resolution generally.
//
// The 0 ms rung is the ladder's own null: everything above it is judged
// against that band, so the ladder answers its question with the same
// mechanism the subject comparisons are judged by.
// ===========================================================================
import type { Browser } from "playwright-core";
import type { Lane } from "./open-subject-page.ts";
import type { InjectionPosition } from "./page/bench-api.types.ts";
import { takeInterleavedPairs } from "./take-interleaved-pairs.ts";
import { bandOf, bandsOverlap, median, round, type Band } from "./statistics.ts";

export const LADDER_MILLISECONDS: readonly number[] = [0, 0.1, 0.25, 0.5, 1, 2, 4];
export const POSITIONS: readonly InjectionPosition[] = [
  "synchronous",
  "microtask",
  "macrotask",
];

export interface LadderRung {
  readonly position: InjectionPosition;
  readonly injectedMilliseconds: number;
  readonly band: Band;
  readonly observedMicroseconds: number;
  readonly resolved: boolean;
}

export interface Ladder {
  readonly shapeId: string;
  readonly subjectId: string;
  readonly rungs: readonly LadderRung[];
  /** Per position, the smallest injected cost that was resolved, in µs. */
  readonly smallestResolved: Readonly<Record<string, number>>;
}

export async function measureCalibrationLadder(request: {
  readonly browser: Browser;
  readonly lanes: readonly [Lane, Lane];
  readonly subjectId: string;
  readonly shapeId: string;
  readonly pairs: number;
  readonly keystrokes: number;
  readonly warmMilliseconds: number;
}): Promise<Ladder> {
  const rungs: LadderRung[] = [];
  const smallestResolved: Record<string, number> = {};

  for (const position of POSITIONS) {
    let nullBand: Band | undefined;
    for (const milliseconds of LADDER_MILLISECONDS) {
      const run = await takeInterleavedPairs({
        browser: request.browser,
        lanes: request.lanes,
        one: {
          label: `ladder-${position}-${milliseconds}`,
          subjectId: request.subjectId,
          cost: { milliseconds, position },
        },
        other: { label: `ladder-${position}-base`, subjectId: request.subjectId },
        shapeId: request.shapeId,
        pairs: request.pairs,
        keystrokes: request.keystrokes,
        warmMilliseconds: request.warmMilliseconds,
      });

      const ratios = run.samples
        .map((sample) => sample.ratio)
        .filter((ratio) => Number.isFinite(ratio));
      const band = bandOf(ratios);
      const observed =
        median(run.samples.map((sample) => sample.one.inputHandlerMicroseconds)) -
        median(run.samples.map((sample) => sample.other.inputHandlerMicroseconds));

      nullBand ??= band;
      // Three conditions, and the third is the one that matters. A band can
      // clear the null band by chance and in the WRONG DIRECTION — the first
      // run of this ladder declared 0.1 ms "resolved" at the macrotask
      // position while recovering 13.5 µs of the 100 µs injected. An injected
      // cost can only ADD, and a metric that claims to have seen 4 ms while
      // accounting for 50 µs of it has not seen it. So a rung is resolved when
      // the band separates upward AND at least half the injected cost is
      // actually recovered in the metric.
      const injectedMicroseconds = milliseconds * 1000;
      const resolved =
        milliseconds > 0 &&
        !bandsOverlap(band, nullBand) &&
        band.low > nullBand.high &&
        observed >= injectedMicroseconds / 2;
      rungs.push({
        position,
        injectedMilliseconds: milliseconds,
        band: { low: round(band.low), middle: round(band.middle), high: round(band.high) },
        observedMicroseconds: round(observed, 1),
        resolved,
      });
      if (resolved && smallestResolved[position] === undefined) {
        smallestResolved[position] = milliseconds * 1000;
      }
    }
    // Nothing at this position was ever resolved: the floor is the top rung,
    // stated as such rather than left absent so a verdict cannot quietly fall
    // through to "no floor to clear".
    smallestResolved[position] ??=
      (LADDER_MILLISECONDS.at(-1) ?? 4) * 1000;
  }

  return { shapeId: request.shapeId, subjectId: request.subjectId, rungs, smallestResolved };
}
