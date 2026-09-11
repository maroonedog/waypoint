// ===========================================================================
// run-time-bench.ts — the browser lane, end to end.
//
// Command: `npm run bench:forms:time`. It builds the page, serves it from two
// origins, drives the locally installed Chrome over CDP and writes
// `docs/measurements-forms-time.md`.
//
// It is printed and never gated. A millisecond moves when the machine does,
// and a CI job that fails on one teaches everybody to re-run it until it
// passes, which is the same thing as having no check at all.
// ===========================================================================
import { mkdirSync, writeFileSync } from "node:fs";
import { buildPage } from "./browser/build-page.ts";
import { serveSubjects } from "./browser/serve-subjects.ts";
import { launchChrome } from "./browser/launch-chrome.ts";
import { describeBrowser } from "./browser/describe-browser.ts";
import { TRACE_CATEGORIES } from "./browser/collect-trace.ts";
import { openLanes, runTimeLane } from "./browser/lane-time.ts";
import { describeMachine } from "./env/describe-machine.ts";
import { describeReactEnvironment } from "./env/describe-react-environment.ts";
import {
  renderComparisons,
  renderNullBands,
  renderResolution,
} from "./report/render-time-tables.ts";
import {
  renderBrowser,
  renderDispatchTypes,
  renderExcluded,
  renderFrameWork,
} from "./report/render-time-environment.ts";

const flag = (name: string, fallback: number): number => {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found === undefined ? fallback : Number(found.split("=")[1]);
};

const PORTS = [flag("port", 5191), flag("port", 5191) + 1] as const;
const rungsFlag = process.argv.find((argument) => argument.startsWith("--rungs="));

const built = await buildPage();
const origins = await Promise.all([
  serveSubjects(built.directory, PORTS[0]),
  serveSubjects(built.directory, PORTS[1]),
]);
const { browser, headless, flags } = await launchChrome();

try {
  const lanes = await openLanes(browser, [origins[0].origin, origins[1].origin]);
  const described = await describeBrowser(lanes[0].page, { headless, flags });

  const sampling = {
    pairs: flag("pairs", 21),
    keystrokes: flag("keystrokes", 12),
    warmMilliseconds: flag("warm", 250),
    rungs: rungsFlag?.split("=")[1]?.split(","),
    withLadder: !process.argv.includes("--skip-ladder"),
  };

  const started = Date.now();
  const result = await runTimeLane(browser, lanes, sampling);
  const minutes = Math.round(((Date.now() - started) / 60_000) * 10) / 10;

  const machine = describeMachine();
  const react = describeReactEnvironment();

  const report = [
    "# Form runtime comparison — time lane",
    "",
    "Every figure below is a microsecond taken from Chrome's own trace, and " +
      "**none of it is gated**. Timings move when the runner does; the " +
      "deterministic argument lives in `measurements-forms.md`, which is the " +
      "lane CI checks.",
    "",
    "## §0 — What this harness can see",
    "",
    renderResolution(result),
    "",
    "### Null bands — each subject against a byte-identical twin",
    "",
    "Two byte-identical pages measured as sequential halves once reported " +
      "**0.8891** — an 11% difference between a page and its own copy. " +
      "Interleaved, the same pages read 0.9956 / 0.9897 / 1.0040. Every band " +
      "below is taken interleaved, at the same size and pair count as the " +
      "comparison it is used to judge.",
    "",
    renderNullBands(result),
    "",
    "## §1 — The comparisons",
    "",
    renderComparisons(result),
    "",
    "## §2 — Frame work",
    "",
    "Style, layout and paint are the part of a keystroke that jsdom cannot " +
      "see at all, which is the whole reason this lane exists beside the " +
      "counts lane. Every figure is per keystroke, over the same window the " +
      "row's ratio came from. Compare the Layout column against the input " +
      "handler column in §1 before concluding anything from either: on this " +
      "page layout alone is routinely larger than the whole script it follows, " +
      "and a benchmark that publishes only the script reports a minority of " +
      "the main-thread work and none of the part a person can see.",
    "",
    renderFrameWork(result),
    "",
    "### EventDispatch by type — the evidence for the filter",
    "",
    "`inputHandlerMicroseconds` is EventDispatch filtered to " +
      "`args.data.type === \"input\"`. On a 200-input page the per-type medians " +
      "run keypress 650 µs, textInput 617, input 77, keydown 24, keyup 12, " +
      "beforeinput 2 — a median over ALL of them once made a 200,000-iteration " +
      "injected busy loop completely invisible. This driver dispatches the " +
      "`input` event itself rather than synthesising a key sequence, so " +
      "`input` is the only type in the window; the table is printed so that is " +
      "a fact a reader can see rather than a claim.",
    "",
    renderDispatchTypes(result),
    "",
    "## §3 — What was run on",
    "",
    renderBrowser(described),
    "",
    `Machine: ${machine.cpu}, ${machine.cores} cores, ${machine.memoryGb} GB, ` +
      `${machine.platform} ${machine.release}, node ${machine.node}. ` +
      `react ${react["react"]}, react-dom ${react["react-dom"]}, ` +
      `zod ${react["zod"]}, react-hook-form ${react["react-hook-form"]}, ` +
      `formik ${react["formik"]}, ` +
      `@tanstack/react-form ${react["@tanstack/react-form"]}. ` +
      `Bundle ${Math.round(built.bytes / 1024)} kB across both origins ` +
      `(${origins[0].origin} and ${origins[1].origin}). Run took ${minutes} minutes.`,
    "",
    `How a sample was taken: ${sampling.pairs} interleaved pairs per ` +
      `comparison, ${sampling.keystrokes} keystrokes per sample, each ` +
      "keystroke followed by a presented frame and a macrotask; both members " +
      "of a pair inside ONE tracing session, on two origins so that they are " +
      "two renderer processes; order alternating every pair and origin " +
      "alternating at the half-way point. Trace categories: " +
      `${TRACE_CATEGORIES.map((category) => `\`${category}\``).join(", ")}.`,
    "",
    "Warm order, in full:",
    "",
    ...result.warmOrder.map((line) => `1. ${line}`),
    "",
    "## §4 — Excluded metrics",
    "",
    renderExcluded(),
    "",
  ].join("\n");

  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/measurements-forms-time.md", report, "utf8");
  console.log(report);
} finally {
  await browser.close();
  await Promise.all(origins.map((origin) => origin.close()));
}
