// ===========================================================================
// take-interleaved-pairs.ts — A,B / B,A, and never two sequential halves.
//
// Interleaving is not a refinement. Two byte-identical pages measured as
// sequential halves reported 0.8891 — an 11% difference between a page and its
// own copy — while the same pages interleaved read 0.9956 / 0.9897 / 1.0040.
// A benchmark that runs all of A and then all of B is reporting when it ran,
// not what it ran.
//
// Order alternates every pair. Origin alternates at the half-way point, so
// neither "went first" nor "was on port 5191" is a property one subject holds
// for the whole run.
//
// Both members of a pair are traced inside ONE tracing session: the ratio then
// cannot carry a difference between two sessions' overheads.
// ===========================================================================
import type { Browser } from "playwright-core";
import type { SampleResult } from "./page/bench-api.types.ts";
import { startTrace, endTrace } from "./collect-trace.ts";
import { cutWindow, summariseWindow, type WindowMetrics } from "./trace-durations.ts";
import { prepare, type Lane, type Side } from "./open-subject-page.ts";

export interface PairSample {
  readonly index: number;
  readonly firstWas: string;
  readonly one: WindowMetrics;
  readonly other: WindowMetrics;
  readonly oneValidatorMicroseconds: number;
  readonly otherValidatorMicroseconds: number;
  readonly oneValidatorPasses: number;
  readonly otherValidatorPasses: number;
  readonly oneInsideDispatchShare: number;
  readonly otherInsideDispatchShare: number;
  readonly ratio: number;
}

export interface PairRun {
  readonly one: Side;
  readonly other: Side;
  readonly shapeId: string;
  readonly leaves: { readonly one: number; readonly other: number };
  readonly samples: readonly PairSample[];
  /**
   * Pairs whose trace could not be cut — a mark that never reached the trace.
   * Counted and published rather than silently absent: a harness that drops
   * samples quietly is a harness whose sample count is a free parameter.
   */
  readonly skipped: number;
}

export interface PairRequest {
  readonly browser: Browser;
  readonly lanes: readonly [Lane, Lane];
  readonly one: Side;
  readonly other: Side;
  readonly shapeId: string;
  readonly pairs: number;
  readonly keystrokes: number;
  readonly warmMilliseconds: number;
}

/** 1 means every pass ran inside the input dispatch; 0 means none did. */
const shareInside = (result: SampleResult): number =>
  result.validatorPasses === 0
    ? 0
    : result.validatorPassesInsideDispatch / result.validatorPasses;

const runSample = (lane: Lane, sampleId: string, keystrokes: number) =>
  lane.page.evaluate(
    ([id, count]) => window.__bench!.run(id as string, count as number),
    [sampleId, keystrokes] as [string, number]
  ) as Promise<SampleResult>;

export async function takeInterleavedPairs(
  request: PairRequest
): Promise<PairRun> {
  const { browser, lanes, one, other, shapeId, pairs, keystrokes } = request;
  const samples: PairSample[] = [];
  const leaves = { one: 0, other: 0 };
  let taken = 0;
  let skipped = 0;

  const halves: readonly (readonly [Lane, Lane])[] = [
    [lanes[0], lanes[1]],
    [lanes[1], lanes[0]],
  ];

  for (const [halfIndex, half] of halves.entries()) {
    const here = halfIndex === 0 ? Math.ceil(pairs / 2) : Math.floor(pairs / 2);
    if (here === 0) continue;
    const [laneForOne, laneForOther] = half;
    leaves.one = await prepare(laneForOne, one, shapeId, request.warmMilliseconds);
    leaves.other = await prepare(laneForOther, other, shapeId, request.warmMilliseconds);

    // The time lane's equal-workload proof, taken rather than assumed. The
    // counts lane hashes the rendered DOM; here the cheap version of the same
    // question is asked every time a pair is prepared, because a ratio between
    // two pages rendering different numbers of fields is not a comparison.
    if (leaves.one !== leaves.other || leaves.one === 0) {
      throw new Error(
        `${one.label} rendered ${leaves.one} fields and ${other.label} ` +
          `rendered ${leaves.other} at ${shapeId}; no ratio between them means ` +
          "anything and none is printed"
      );
    }

    for (let inHalf = 0; inHalf < here; inHalf += 1) {
      const oneFirst = taken % 2 === 0;
      const oneId = `${one.label}-${taken}`;
      const otherId = `${other.label}-${taken}`;

      const client = await startTrace(browser);
      let oneResult: SampleResult;
      let otherResult: SampleResult;
      if (oneFirst) {
        oneResult = await runSample(laneForOne, oneId, keystrokes);
        otherResult = await runSample(laneForOther, otherId, keystrokes);
      } else {
        otherResult = await runSample(laneForOther, otherId, keystrokes);
        oneResult = await runSample(laneForOne, oneId, keystrokes);
      }
      const events = await endTrace(client);

      // A pair whose marks did not reach the trace is not a pair. It is
      // dropped as a WHOLE — never one half of it, which would silently
      // compare one subject's good sample against the other's absence — and
      // the count of drops is published beside the results.
      let oneMetrics;
      let otherMetrics;
      try {
        oneMetrics = summariseWindow(
          events,
          cutWindow(events, oneResult.beginMark, oneResult.endMark)
        );
        otherMetrics = summariseWindow(
          events,
          cutWindow(events, otherResult.beginMark, otherResult.endMark)
        );
      } catch {
        skipped += 1;
        taken += 1;
        continue;
      }

      samples.push({
        index: taken,
        firstWas: oneFirst ? one.label : other.label,
        one: oneMetrics,
        other: otherMetrics,
        // PER KEYSTROKE. The page accumulates validator time over the whole
        // sample while the input handler figure is a per-dispatch median, and
        // publishing the two side by side in different units would make the
        // subtraction between them nonsense in a way nothing would flag.
        oneValidatorMicroseconds:
          oneResult.validatorMicroseconds / oneResult.keystrokes,
        otherValidatorMicroseconds:
          otherResult.validatorMicroseconds / otherResult.keystrokes,
        oneValidatorPasses: oneResult.validatorPasses / oneResult.keystrokes,
        otherValidatorPasses: otherResult.validatorPasses / otherResult.keystrokes,
        oneInsideDispatchShare: shareInside(oneResult),
        otherInsideDispatchShare: shareInside(otherResult),
        ratio:
          otherMetrics.inputHandlerMicroseconds === 0
            ? Number.NaN
            : oneMetrics.inputHandlerMicroseconds /
              otherMetrics.inputHandlerMicroseconds,
      });
      taken += 1;
    }
  }

  if (samples.length === 0) {
    throw new Error(
      `every pair of ${one.label} against ${other.label} at ${shapeId} was ` +
        "dropped; there is nothing to report and nothing is printed for it"
    );
  }
  return { one, other, shapeId, leaves, samples, skipped };
}
