// What the timing lane is allowed to call a win.
//
// The rule under test came out of a real CI run: waypoint measured 0.537x
// the hand-written reference at 201 fields and the harness printed `faster` —
// while the same harness had counted that 0% of its validator work ran inside
// the event being timed, and its own ladder had reported that nothing up to
// 4 ms is resolvable at the microtask position.
//
// Remove the `defersUnseenWork` branch in summarise-samples.ts and the first
// test here fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { summariseSamples } from "../bench/browser/summarise-samples.ts";

const WIDE_NULL_BAND = { low: 0.95, middle: 1, high: 1.05 };

/**
 * One pair run, shaped the way take-interleaved-pairs produces them. `ratio`
 * is what the subject measured against the denominator; `inside` is the share
 * of its validator passes that ran within the input dispatch.
 */
const runWith = ({ ratio, inside, validatorMicroseconds }) => {
  const window = (microseconds) => ({
    inputHandlerMicroseconds: microseconds,
    eventDispatchByType: { input: microseconds },
    inputDispatchCount: 1,
    layoutMicroseconds: 0,
    layoutCount: 1,
    updateLayoutTreeMicroseconds: 0,
    recalcStyleCount: 1,
    paintMicroseconds: 0,
    gcMicroseconds: 0,
  });

  return {
    one: { label: "subject", subjectId: "subject" },
    other: { label: "denominator", subjectId: "denominator" },
    shapeId: "leaves-201",
    leaves: { one: 201, other: 201 },
    skipped: 0,
    samples: Array.from({ length: 21 }, (_unused, index) => ({
      index,
      firstWas: index % 2 === 0 ? "subject" : "denominator",
      one: window(1000 * ratio),
      other: window(1000),
      oneValidatorMicroseconds: validatorMicroseconds,
      otherValidatorMicroseconds: 250,
      oneValidatorPasses: validatorMicroseconds > 0 ? 1 : 0,
      otherValidatorPasses: 1,
      oneInsideDispatchShare: inside,
      otherInsideDispatchShare: 1,
      ratio,
    })),
  };
};

const RESOLUTION = {
  nullBand: WIDE_NULL_BAND,
  smallestResolvedMicroseconds: 250,
  ladderWasRun: true,
};

test("a subject that defers its validator work out of the dispatch cannot be called faster", () => {
  const summary = summariseSamples(
    runWith({ ratio: 0.537, inside: 0, validatorMicroseconds: 255.8 }),
    RESOLUTION
  );

  assert.equal(summary.verdict, "indistinguishable");
  assert.match(summary.why, /0% of its/);
  assert.match(summary.why, /microtask position/);
});

test("a subject that did no validator work at all keeps its faster verdict", () => {
  // react-hook-form in on-submit mode: nothing is deferred because nothing
  // happened. That is a documented policy, and its own column reports it.
  const summary = summariseSamples(
    runWith({ ratio: 0.272, inside: 0, validatorMicroseconds: 0 }),
    RESOLUTION
  );

  assert.equal(summary.verdict, "faster");
});

test("a subject whose work IS inside the dispatch can still be called faster", () => {
  const summary = summariseSamples(
    runWith({ ratio: 0.5, inside: 1, validatorMicroseconds: 255.8 }),
    RESOLUTION
  );

  assert.equal(summary.verdict, "faster");
});

test("deferring work does not rescue a subject that is slower anyway", () => {
  // The test is one-sided on purpose: being slower WHILE moving work out of
  // the measured window is a finding the deferral cannot explain away.
  const summary = summariseSamples(
    runWith({ ratio: 4.2, inside: 0, validatorMicroseconds: 255.8 }),
    RESOLUTION
  );

  assert.equal(summary.verdict, "slower");
});

test("a band overlapping the null band still outranks every other reason", () => {
  const summary = summariseSamples(
    runWith({ ratio: 1.0, inside: 0, validatorMicroseconds: 255.8 }),
    RESOLUTION
  );

  assert.equal(summary.verdict, "indistinguishable");
  assert.match(summary.why, /overlaps the null band/);
});
