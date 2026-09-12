// ===========================================================================
// measure-write-cost.ts — the whole keystroke, so the scan has something to be
// read against.
//
// A scan cost printed alone is a number a reader cannot size. This file prints
// the two things it sits inside: one `setValue` through the field handle, and
// one whole-root validation pass through the adapter — the pass that same
// keystroke schedules on the default `validateOn: "change"`.
//
// `validateOn: "submit"` on the form under the loop, so the coalescing microtask
// is never even asked for. It could not run inside a synchronous loop anyway,
// and a measurement that depends on that is one that breaks the day the loop
// yields. The pass is then timed separately through `adapter.validate`, which
// is the same call the scheduler makes.
//
// Not gated, for the reason measure-scan-cost.ts gives at greater length: this
// machine moved these numbers by 3× between two runs an hour apart, and the
// spread column is printed so a reader can see that rather than be told it.
// ===========================================================================
import { isPending, type FormAdapter } from "@maroonedog/form-contract";
import { createForm, type FormHandle } from "@maroonedog/form-contract/core";
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";
import { median, relativeSpreadPercent } from "../browser/statistics.ts";
import type { Shape } from "../shape/build-shape.ts";
import { SCANNED_LEAF } from "./measure-scan-cost.ts";

const ALTERNATED = ["Lovelace", "Lovelac"] as const;
const WRITES_PER_SAMPLE = 1_000;
const PASSES_PER_SAMPLE = 20;
const SAMPLES = 15;
const WARM_SAMPLES = 3;

export interface WriteCostRow {
  readonly shapeId: string;
  readonly leaves: number;
  /** Every leaf open, which is what a fully rendered form has. */
  readonly openValueCells: number;
  readonly nanosecondsPerWrite: number;
  readonly writeSpreadPercent: number;
  readonly nanosecondsPerPass: number;
  readonly passSpreadPercent: number;
}

const adapterFor = (shape: Shape): FormAdapter<unknown, string> =>
  zodFormResolver(
    shape.schema as Parameters<typeof zodFormResolver>[0]
  ) as FormAdapter<unknown, string>;

function formWithEveryFieldOpen(shape: Shape): FormHandle<unknown, string> {
  const form: FormHandle<unknown, string> = createForm({
    adapter: adapterFor(shape),
    defaultValues: shape.defaults(),
    validateOn: "submit",
  });
  for (const path of shape.concretePaths) {
    form.field(path).sources.value.subscribe(() => undefined);
  }
  return form;
}

export function measureWriteCost(shape: Shape): WriteCostRow {
  const form = formWithEveryFieldOpen(shape);
  const field = form.field(SCANNED_LEAF);
  const adapter = adapterFor(shape);
  const root = shape.defaults();

  const oneWriteSample = (): number => {
    const started = process.hrtime.bigint();
    for (let index = 0; index < WRITES_PER_SAMPLE; index += 1) {
      field.setValue(ALTERNATED[index & 1] as never);
    }
    return Number(process.hrtime.bigint() - started) / WRITES_PER_SAMPLE;
  };
  const onePassSample = (): number => {
    const started = process.hrtime.bigint();
    for (let index = 0; index < PASSES_PER_SAMPLE; index += 1) {
      const outcome = adapter.validate(root);
      if (isPending(outcome)) throw new Error("The zod resolver judged asynchronously.");
    }
    return Number(process.hrtime.bigint() - started) / PASSES_PER_SAMPLE;
  };

  for (let round = 0; round < WARM_SAMPLES; round += 1) {
    oneWriteSample();
    onePassSample();
  }
  const writes: number[] = [];
  const passes: number[] = [];
  for (let round = 0; round < SAMPLES; round += 1) {
    writes.push(oneWriteSample());
    passes.push(onePassSample());
  }

  return {
    shapeId: shape.id,
    leaves: shape.concretePaths.length,
    openValueCells: shape.concretePaths.length,
    nanosecondsPerWrite: median(writes),
    writeSpreadPercent: relativeSpreadPercent(writes),
    nanosecondsPerPass: median(passes),
    passSpreadPercent: relativeSpreadPercent(passes),
  };
}
