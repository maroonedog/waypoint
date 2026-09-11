// ===========================================================================
// render-time-environment.ts — the frame, the filter, and what was left out.
//
// Style, layout, paint and GC are the part of a keystroke jsdom cannot see at
// all, which is the whole reason a second lane exists beside the counts one.
// The dispatch-type table is the evidence for the single filter every headline
// figure depends on, and the excluded-metrics table is the list of what was
// measured and then thrown away, so a reader can check whether the discarded
// ones happen to be the flattering ones.
// ===========================================================================
import type { TimeLaneResult } from "../browser/lane-time.ts";
import type { BrowserDescription } from "../browser/describe-browser.ts";
import { EXCLUDED_METRICS } from "../browser/excluded-metrics.ts";
import { code, table } from "./markdown-table.ts";

export function renderFrameWork(result: TimeLaneResult): string {
  const rows = result.rungs.flatMap((rung) =>
    rung.comparisons.map((summary) => [
      rung.shapeId,
      code(summary.one.label),
      `${summary.one.updateLayoutTreeMicroseconds} µs`,
      String(summary.one.recalcStyleCount),
      `${summary.one.layoutMicroseconds} µs`,
      String(summary.one.layoutCount),
      `${summary.one.paintMicroseconds} µs`,
      `${summary.one.gcMicroseconds} µs`,
    ])
  );
  return table(
    [
      "shape",
      "subject",
      "UpdateLayoutTree",
      "RecalcStyleCount",
      "Layout",
      "LayoutCount",
      "Paint+PrePaint+Commit",
      "GC",
    ],
    rows
  );
}

/** The evidence for the filter, rather than the claim that one is needed. */
export function renderDispatchTypes(result: TimeLaneResult): string {
  const types = new Set<string>();
  for (const rung of result.rungs) {
    for (const summary of rung.comparisons) {
      for (const type of Object.keys(summary.one.dispatchTypes)) types.add(type);
    }
  }
  const ordered = [...types].sort();
  const rows = result.rungs.flatMap((rung) =>
    rung.comparisons.map((summary) => [
      rung.shapeId,
      code(summary.one.label),
      String(summary.one.inputDispatchCount),
      ...ordered.map((type) => {
        const held = summary.one.dispatchTypes[type];
        return held === undefined ? "—" : `${held} µs`;
      }),
    ])
  );
  return table(["shape", "subject", "input dispatches", ...ordered], rows);
}

export function renderExcluded(): string {
  return table(
    ["metric", "taken from", "why it is not published"],
    EXCLUDED_METRICS.map((metric) => [
      code(metric.name),
      metric.source,
      metric.reason,
    ])
  );
}

export function renderBrowser(browser: BrowserDescription): string {
  return table(
    ["what", "value"],
    [
      ["product", browser.product],
      ["revision", browser.revision],
      ["V8", browser.jsVersion],
      ["CDP protocol", browser.protocolVersion],
      ["user agent", browser.userAgent],
      ["headless", String(browser.headless)],
      ["flags", browser.flags.map(code).join(" ")],
      ["devicePixelRatio", String(browser.devicePixelRatio)],
      ["observed refresh", `${browser.observedRefreshHz} Hz`],
      ["CPU throttle", `${browser.cpuThrottleRate}x`],
      ["crossOriginIsolated", String(browser.crossOriginIsolated)],
      ["performance.now() tick", `${browser.clockTickMicroseconds} µs`],
      ["hardwareConcurrency", String(browser.hardwareConcurrency)],
    ]
  );
}
