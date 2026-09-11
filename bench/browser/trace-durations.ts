// ===========================================================================
// trace-durations.ts — cutting one sample out of a whole-browser trace.
//
// The window is the page's own pair of marks, and the process is the one that
// emitted them, so two subjects traced in one session cannot contaminate each
// other's numbers even though they share the file.
//
// THE FILTER IS LOAD-BEARING. `inputHandlerMicroseconds` is EventDispatch
// filtered to `args.data.type === "input"`. Measured per-keystroke medians by
// type on a 200-input page: keypress 650 µs, textInput 617, input 77, keydown
// 24, keyup 12, beforeinput 2. A median over ALL EventDispatch events made a
// 200,000-iteration injected busy loop completely invisible.
//
// This driver types the way the counts lane types — the value written through
// the prototype setter, then one bubbling `input` event — so that the two
// lanes cannot come to measure different code paths. The consequence is that
// `input` is the ONLY dispatch type in the window, and the per-type table is
// published so a reader can see that rather than take it on trust. What the
// filter buys here is that the number stays the same quantity it would be
// under a full key sequence: the `input` portion of it.
// ===========================================================================
import type { TraceEvent } from "./collect-trace.ts";
import { median, sum } from "./statistics.ts";

export interface SampleWindow {
  readonly pid: number;
  readonly from: number;
  readonly to: number;
}

export interface WindowMetrics {
  readonly inputHandlerMicroseconds: number;
  readonly eventDispatchByType: Readonly<Record<string, number>>;
  readonly inputDispatchCount: number;
  readonly layoutMicroseconds: number;
  readonly layoutCount: number;
  readonly updateLayoutTreeMicroseconds: number;
  readonly recalcStyleCount: number;
  readonly paintMicroseconds: number;
  readonly gcMicroseconds: number;
}

const markNamed = (
  events: readonly TraceEvent[],
  name: string
): TraceEvent | undefined =>
  events.find((event) => event.name === name && event.cat.includes("user_timing"));

/** The window a page marked, or an error naming the mark that never arrived. */
export function cutWindow(
  events: readonly TraceEvent[],
  beginMark: string,
  endMark: string
): SampleWindow {
  const begin = markNamed(events, beginMark);
  const end = markNamed(events, endMark);
  if (begin === undefined || end === undefined) {
    throw new Error(
      `the trace has no ${begin === undefined ? beginMark : endMark}; the ` +
        "sample cannot be cut out of it and no figure is printed for it"
    );
  }
  if (begin.pid !== end.pid) {
    throw new Error("the sample's marks came from two different processes");
  }
  return { pid: begin.pid, from: begin.ts, to: end.ts };
}

const inWindow = (event: TraceEvent, window: SampleWindow): boolean =>
  event.pid === window.pid && event.ts >= window.from && event.ts <= window.to;

const durationsOf = (
  events: readonly TraceEvent[],
  window: SampleWindow,
  named: (name: string) => boolean
): number[] =>
  events
    .filter((event) => named(event.name) && inWindow(event, window))
    .map((event) => event.dur ?? 0);

const isGarbageCollection = (name: string): boolean =>
  name.startsWith("V8.GC") ||
  name === "MajorGC" ||
  name === "MinorGC" ||
  name === "BlinkGC.AtomicPhase";

export function summariseWindow(
  events: readonly TraceEvent[],
  window: SampleWindow
): WindowMetrics {
  const dispatches = events.filter(
    (event) => event.name === "EventDispatch" && inWindow(event, window)
  );

  const byType = new Map<string, number[]>();
  for (const event of dispatches) {
    const type = event.args?.data?.type ?? "unknown";
    byType.set(type, [...(byType.get(type) ?? []), event.dur ?? 0]);
  }
  const inputs = byType.get("input") ?? [];
  const layouts = durationsOf(events, window, (name) => name === "Layout");
  const styles = durationsOf(events, window, (name) => name === "UpdateLayoutTree");

  return {
    inputHandlerMicroseconds: median(inputs),
    eventDispatchByType: Object.fromEntries(
      [...byType.entries()].map(([type, values]) => [type, median(values)])
    ),
    inputDispatchCount: inputs.length,
    layoutMicroseconds: sum(layouts),
    layoutCount: layouts.length,
    updateLayoutTreeMicroseconds: sum(styles),
    recalcStyleCount: styles.length,
    paintMicroseconds: sum(
      durationsOf(events, window, (name) =>
        name === "Paint" || name === "PrePaint" || name === "Commit"
      )
    ),
    // Chrome has no PerformanceObserver entry type for GC — that is a Node
    // API, and the browser design prescribed one that does not exist. Taken
    // from the trace instead, which is the same figure from a source the page
    // cannot influence. Samples are never dropped for it: a 4.2 ms pause
    // against a 48 ms sample is 9% and the reader is entitled to see it.
    gcMicroseconds: sum(durationsOf(events, window, isGarbageCollection)),
  };
}
