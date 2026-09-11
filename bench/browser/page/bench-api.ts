// ===========================================================================
// bench-api.ts — everything the driver can ask this page to do.
//
// The page mounts the SAME subject modules the counts lane mounts, built from
// the same `.ts` files through vite, so the two lanes cannot drift into
// measuring different code by way of a build step.
//
// Nothing here reports a duration. The page marks the window it worked in and
// the driver reads the durations out of the browser's own trace, because a
// page that times itself is a page whose timing is in the sample.
// ===========================================================================
import { SHAPES } from "../../shape/build-shape.ts";
import { countValidatorWork, type CountedSchema } from "../../shape/count-validator-work.ts";
import { driveInput, type InputTarget } from "../../react-work/drive-input.ts";
import { SUBJECTS, subjectById } from "../../subjects/subject-registry.ts";
import { injectCost, clearInjectedCost } from "./inject-cost.ts";
import type { BenchApi, PageFacts, SampleResult } from "./bench-api.types.ts";
import type { MountedSubject } from "../../subjects/subject.types.ts";

/** The steady-state keystroke: a value the verdict never moves for. */
const TYPED_PATH = "applicant.lastName";

const shapeById = (id: string) => {
  const found = SHAPES.find((shape) => shape.id === id);
  if (found === undefined) throw new Error(`no shape named "${id}"`);
  return found;
};

const target: InputTarget = {
  document,
  window: window as unknown as InputTarget["window"],
};

const nextFrameThenTask = (): Promise<void> =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });

/** The smallest step this page can observe, which bounds everything below it. */
const measureClockTick = (): number => {
  let smallest = Infinity;
  for (let taken = 0; taken < 200_000; taken += 1) {
    const before = performance.now();
    const after = performance.now();
    const step = after - before;
    if (step > 0 && step < smallest) smallest = step;
  }
  return smallest === Infinity ? 0 : Math.round(smallest * 1000 * 100) / 100;
};

let clockTick: number | undefined;
let container: HTMLDivElement | undefined;
let mounted: MountedSubject | undefined;
let counted: CountedSchema<object> | undefined;
let typed = 0;

// True for exactly as long as the input event is being dispatched. Everything
// a subject does synchronously in its handler sees it; a microtask or a timer
// does not. That is the whole distinction the calibration ladder showed the
// headline metric turns on, so it is measured here rather than asserted in the
// report.
let duringDispatch = false;

const keystroke = (): void => {
  typed += 1;
  duringDispatch = true;
  try {
    driveInput(target, TYPED_PATH, `Lovelace${typed}`);
  } finally {
    duringDispatch = false;
  }
};

export function installBenchApi(): void {
  const api: BenchApi = {
    facts(): PageFacts {
      clockTick ??= measureClockTick();
      return {
        crossOriginIsolated: globalThis.crossOriginIsolated === true,
        clockTickMicroseconds: clockTick,
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency,
      };
    },

    subjects() {
      return SUBJECTS.map((subject) => ({
        id: subject.id,
        library: subject.library,
        policy: subject.policy,
        treeClass: subject.treeClass,
        notes: subject.notes,
      }));
    },

    shapes() {
      return SHAPES.map((shape) => ({
        id: shape.id,
        leaves: shape.concretePaths.length,
      }));
    },

    // The oracle warms the shared zod instance before any subject is given a
    // turn, so the first subject measured does not pay for lazy initialisation
    // every later subject rides free on. The warm order is published.
    warmSchema(shapeId) {
      const shape = shapeById(shapeId);
      const raw = shape.schema as { safeParse(root: unknown): unknown };
      for (let taken = 0; taken < 20; taken += 1) raw.safeParse(shape.defaults());
    },

    async mount(subjectId, shapeId) {
      api.unmount();
      const shape = shapeById(shapeId);
      const subject = subjectById(subjectId);
      counted = countValidatorWork(
        shape.schema,
        shape.concretePaths,
        () => duringDispatch
      );
      container = document.createElement("div");
      document.getElementById("root")?.append(container);
      mounted = subject.mount(container, {
        schema: counted.schema,
        paths: shape.concretePaths,
        defaults: shape.defaults,
      });
      // Three turns, the same as the counts lane: a subscription installed in
      // a passive effect is not installed after one.
      for (let taken = 0; taken < 3; taken += 1) await nextFrameThenTask();
    },

    unmount() {
      mounted?.unmount();
      container?.remove();
      mounted = undefined;
      container = undefined;
      counted = undefined;
    },

    async warm(milliseconds) {
      const until = performance.now() + milliseconds;
      while (performance.now() < until) {
        keystroke();
        await nextFrameThenTask();
      }
    },

    async run(sampleId, keystrokes) {
      if (counted === undefined) throw new Error("nothing is mounted");
      counted.reset();
      const beginMark = `bench:begin:${sampleId}`;
      const endMark = `bench:end:${sampleId}`;
      performance.mark(beginMark);
      for (let taken = 0; taken < keystrokes; taken += 1) {
        keystroke();
        await nextFrameThenTask();
      }
      performance.mark(endMark);
      const result: SampleResult = {
        beginMark,
        endMark,
        keystrokes,
        validatorPasses: counted.work.passes,
        validatorPassesInsideDispatch: counted.work.passesInsideDispatch,
        validatorMicroseconds:
          Math.round(Number(counted.work.nanoseconds) / 100) / 10,
      };
      return result;
    },

    injectCost,
    clearInjectedCost,

    renderedLeaves() {
      return container?.querySelectorAll("[data-path]").length ?? 0;
    },
  };

  window.__bench = api;
}
