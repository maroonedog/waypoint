// ===========================================================================
// lane-time.ts — the only lane permitted to publish a millisecond.
//
// The order of this file is the argument. The harness measures its own
// resolution FIRST — the calibration ladder, then each subject against a
// byte-identical twin — and only then compares two libraries, so that no
// verdict can be reached before the thing that decides whether a verdict is
// possible has been taken.
//
// Nothing here is gated. These figures move when the machine does, which is
// why the counts lane exists and why this one prints.
// ===========================================================================
import type { Browser } from "playwright-core";
import type { Lane, Side } from "./open-subject-page.ts";
import type { SubjectFact, ShapeFact } from "./page/bench-api.types.ts";
import { openLane } from "./open-subject-page.ts";
import { takeInterleavedPairs } from "./take-interleaved-pairs.ts";
import { measureNullBand, widerOf, type NullBand } from "./measure-null-band.ts";
import { measureCalibrationLadder, type Ladder } from "./measure-calibration-ladder.ts";
import { summariseSamples, type Summary } from "./summarise-samples.ts";
import { DENOMINATOR } from "../subjects/subject-ids.ts";

export { DENOMINATOR } from "../subjects/subject-ids.ts";

export interface TimeLaneOptions {
  readonly pairs: number;
  readonly keystrokes: number;
  readonly warmMilliseconds: number;
  readonly rungs: readonly string[] | undefined;
  readonly withLadder: boolean;
}

export interface RungResult {
  readonly shapeId: string;
  readonly leaves: number;
  readonly nulls: readonly NullBand[];
  readonly comparisons: readonly Summary[];
}

export interface TimeLaneResult {
  readonly subjects: readonly SubjectFact[];
  readonly shapes: readonly ShapeFact[];
  readonly warmOrder: readonly string[];
  readonly ladder: Ladder | undefined;
  readonly rungs: readonly RungResult[];
}

const sideFor = (subjectId: string): Side => ({ label: subjectId, subjectId });

// To stderr, so the report on stdout stays a report. A lane that runs for
// twenty minutes in silence is a lane nobody runs twice.
const say = (line: string): void => {
  console.error(`  ${line}`);
};

export async function openLanes(
  browser: Browser,
  origins: readonly [string, string]
): Promise<readonly [Lane, Lane]> {
  return [
    await openLane(browser, "lane-1", origins[0]),
    await openLane(browser, "lane-2", origins[1]),
  ];
}

export async function runTimeLane(
  browser: Browser,
  lanes: readonly [Lane, Lane],
  options: TimeLaneOptions
): Promise<TimeLaneResult> {
  const [laneOne] = lanes;
  const subjects = await laneOne.page.evaluate(() => window.__bench!.subjects());
  const shapes = await laneOne.page.evaluate(() => window.__bench!.shapes());
  const wanted = shapes.filter(
    (shape) => options.rungs === undefined || options.rungs.includes(shape.id)
  );
  if (wanted.length === 0) throw new Error("no shape matched --rungs");

  const common = {
    browser,
    lanes,
    pairs: options.pairs,
    keystrokes: options.keystrokes,
    warmMilliseconds: options.warmMilliseconds,
  };

  // ---- the harness's own resolution, before any comparison ------------------
  const largest = wanted.at(-1) as ShapeFact;
  if (options.withLadder) {
    say(`calibrating against ${largest.id}: 7 rungs x 3 positions`);
  }
  const ladder = options.withLadder
    ? await measureCalibrationLadder({
        ...common,
        subjectId: DENOMINATOR,
        shapeId: largest.id,
      })
    : undefined;
  const floor = ladder?.smallestResolved["synchronous"] ?? Number.POSITIVE_INFINITY;

  const rungs: RungResult[] = [];
  for (const shape of wanted) {
    say(`${shape.id} — ${shape.leaves} fields`);
    const comparisons: Summary[] = [];
    // The denominator's own twin first, because every comparison at this rung
    // is judged against it and a band cannot be used before it is taken.
    say(`  null twin: ${DENOMINATOR}`);
    const nulls: NullBand[] = [
      await measureNullBand({ ...common, subjectId: DENOMINATOR, shapeId: shape.id }),
    ];

    // Interleaved through the run, not taken once at the start: variance
    // scales with work, and a null band taken at 31 fields would declare rows
    // at 201 fields resolved well inside their own noise.
    for (const subject of subjects) {
      if (subject.id === DENOMINATOR) continue;
      say(`  ${subject.id}`);
      nulls.push(
        await measureNullBand({ ...common, subjectId: subject.id, shapeId: shape.id })
      );

      const run = await takeInterleavedPairs({
        ...common,
        one: sideFor(subject.id),
        other: sideFor(DENOMINATOR),
        shapeId: shape.id,
      });
      const twinOf = (id: string) =>
        nulls.find((held) => held.subjectId === id)?.band ??
        { low: 1, middle: 1, high: 1 };
      comparisons.push(
        summariseSamples(run, {
          nullBand: widerOf(twinOf(subject.id), twinOf(DENOMINATOR)),
          smallestResolvedMicroseconds: floor,
          ladderWasRun: ladder !== undefined,
        })
      );
    }
    rungs.push({ shapeId: shape.id, leaves: shape.leaves, nulls, comparisons });
  }

  return {
    subjects,
    shapes,
    warmOrder: [
      "the oracle warms every shape's schema on both lanes, before any mount",
      ...subjects.map(
        (subject) => `${subject.id} warms ${options.warmMilliseconds} ms`
      ),
    ],
    ladder,
    rungs,
  };
}
