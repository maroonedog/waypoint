// ===========================================================================
// summarise-side.ts — one side of a pair, in one set of units.
//
// Everything on a row is PER KEYSTROKE. The trace hands back the input
// handler as a per-dispatch duration but layout, paint and GC as sums over the
// whole window, and a sum sitting beside a median under one heading is two
// units wearing one label. The division happens here, once, rather than in
// whichever table happened to need it.
// ===========================================================================
import type { PairRun } from "./take-interleaved-pairs.ts";
import { median, round } from "./statistics.ts";

export interface SideSummary {
  readonly label: string;
  readonly inputHandlerMicroseconds: number;
  readonly validatorMicroseconds: number;
  readonly validatorPasses: number;
  /**
   * The measured share of passes that ran inside the input dispatch. The
   * subtraction below is only arithmetic when this is 1: at 0 the pass is not
   * in the handler figure at all, so subtracting it invents a number.
   */
  readonly insideDispatchShare: number;
  readonly runtimeMicroseconds: number;
  readonly layoutMicroseconds: number;
  readonly layoutCount: number;
  readonly updateLayoutTreeMicroseconds: number;
  readonly recalcStyleCount: number;
  readonly paintMicroseconds: number;
  readonly gcMicroseconds: number;
  /**
   * Every EventDispatch type that occurred in the window, with its median.
   * Published so the load-bearing `type === "input"` filter is checkable
   * rather than assertable.
   */
  readonly dispatchTypes: Readonly<Record<string, number>>;
  readonly inputDispatchCount: number;
}

type Sample = PairRun["samples"][number];

/** Median of the per-sample medians, per dispatch type. */
const medianByType = (
  perSample: readonly Readonly<Record<string, number>>[]
): Record<string, number> => {
  const gathered = new Map<string, number[]>();
  for (const sample of perSample) {
    for (const [type, value] of Object.entries(sample)) {
      gathered.set(type, [...(gathered.get(type) ?? []), value]);
    }
  }
  return Object.fromEntries(
    [...gathered.entries()].map(([type, values]) => [type, round(median(values), 1)])
  );
};

type SummedMetric =
  | "layoutMicroseconds"
  | "layoutCount"
  | "updateLayoutTreeMicroseconds"
  | "recalcStyleCount"
  | "paintMicroseconds"
  | "gcMicroseconds";

/** A trace sum over the window, divided by the keystrokes that filled it. */
const perKeystroke =
  (which: "one" | "other", metric: SummedMetric) =>
  (sample: Sample): number =>
    sample[which][metric] / Math.max(1, sample[which].inputDispatchCount);

export function summariseSide(
  label: string,
  run: PairRun,
  which: "one" | "other"
): SideSummary {
  const pick = <T>(read: (sample: Sample) => T): T[] => run.samples.map(read);
  const inputHandler = median(
    pick((sample) => sample[which].inputHandlerMicroseconds)
  );
  const validator = median(
    pick((sample) =>
      which === "one"
        ? sample.oneValidatorMicroseconds
        : sample.otherValidatorMicroseconds
    )
  );
  const inside = median(
    pick((sample) =>
      which === "one"
        ? sample.oneInsideDispatchShare
        : sample.otherInsideDispatchShare
    )
  );

  return {
    label,
    inputHandlerMicroseconds: round(inputHandler, 1),
    validatorMicroseconds: round(validator, 1),
    validatorPasses: round(
      median(
        pick((sample) =>
          which === "one" ? sample.oneValidatorPasses : sample.otherValidatorPasses
        )
      ),
      2
    ),
    insideDispatchShare: round(inside, 2),
    // A subtraction, labelled as one. It is not a measurement of the runtime.
    runtimeMicroseconds: round(inputHandler - validator, 1),
    layoutMicroseconds: round(median(pick(perKeystroke(which, "layoutMicroseconds"))), 1),
    layoutCount: round(median(pick(perKeystroke(which, "layoutCount"))), 2),
    updateLayoutTreeMicroseconds: round(
      median(pick(perKeystroke(which, "updateLayoutTreeMicroseconds"))),
      1
    ),
    recalcStyleCount: round(median(pick(perKeystroke(which, "recalcStyleCount"))), 2),
    paintMicroseconds: round(median(pick(perKeystroke(which, "paintMicroseconds"))), 1),
    gcMicroseconds: round(median(pick(perKeystroke(which, "gcMicroseconds"))), 1),
    dispatchTypes: medianByType(pick((sample) => sample[which].eventDispatchByType)),
    inputDispatchCount: round(
      median(pick((sample) => sample[which].inputDispatchCount)),
      1
    ),
  };
}
