// ===========================================================================
// excluded-metrics.ts — what was measured and then thrown away, and why.
//
// Every one of these was taken first and excluded afterwards, each with the
// measurement that excluded it. Publishing the list is the difference between
// a benchmark that chose its metrics and one that happens to have chosen well:
// a reader can check whether the excluded ones are the flattering ones.
// ===========================================================================

export interface ExcludedMetric {
  readonly name: string;
  readonly source: string;
  readonly reason: string;
}

export const EXCLUDED_METRICS: readonly ExcludedMetric[] = [
  {
    name: "ScriptDuration",
    source: "Performance.getMetrics",
    reason:
      "245% pair-ratio spread between two BYTE-IDENTICAL pages. A metric that " +
      "cannot tell a page from its own copy cannot tell two libraries apart.",
  },
  {
    name: "TaskDuration",
    source: "Performance.getMetrics",
    reason:
      "2.94 ms per keystroke against 26 µs of actual script: it is dominated " +
      "by the driver's own CDP round trip, so it measures the harness.",
  },
  {
    name: "PerformanceEventTiming.duration",
    source: "PerformanceObserver, entryType 'event'",
    reason:
      "Quantised to 8 ms by specification. Every figure this lane publishes is " +
      "smaller than one quantum of it.",
  },
  {
    name: "Profiler.actualDuration",
    source: "React's <Profiler onRender>",
    reason:
      "About 6x smaller than wall clock because it excludes commit, and it " +
      "fires ZERO times in the production react-dom build this lane requires.",
  },
  {
    name: "every millisecond taken in jsdom",
    source: "the counts lane",
    reason:
      "jsdom has no layout, no style resolution, no paint and no compositor. " +
      "Measured on a 200-input page: 216-272 µs of layout against 26 µs of " +
      "script per keystroke. Publishing the 26 as 'the cost of typing' reports " +
      "9% of the main-thread work and none of the part a person can see.",
  },
  {
    name: "EventLatency",
    source: "the trace, categories cc,benchmark",
    reason:
      "Chrome emits it only for input the compositor actually delivered. This " +
      "driver types the way the counts lane types — the value through the " +
      "prototype setter, then one bubbling `input` event — so a run produces " +
      "ZERO EventLatency events. Measured: 0 across a whole trace. A column of " +
      "zeros reads as a result; an absent column reads as what it is.",
  },
  {
    name: "PerformanceObserver entryTypes: ['gc']",
    source: "the browser design's own prescription",
    reason:
      "No such entry type exists in Chrome — it is a Node perf_hooks API. GC " +
      "is taken from the trace instead (V8.GC*, MajorGC, MinorGC) and " +
      "published as a column; samples are never dropped for it.",
  },
];
