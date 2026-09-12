// Capturing `console.warn`, and clearing the memo behind it — where the second
// half is the one that is not housekeeping.
//
// The degradation signal is said ONCE per vendor and state, on purpose: a
// warning repeated per form is a warning a developer installs a filter for. But
// that memo lives in the resolver module, not in the test, so it survives from
// one test into the next inside a file. Measured on this build rather than
// assumed — two consecutive resolutions of the same judging-only vendor print
// one line and then zero, and one again after `forgetUndescribedFormWarnings()`.
//
// Without the reset, then, a test asserting the sentence passes when it runs
// first and fails when it runs second, and its failure says "expected one line,
// got none" — which reads as the signal being broken. The reader goes to look
// at the resolver, where nothing is wrong. That is why the reset is inside the
// capture rather than beside it: the two cannot be separated by somebody who
// only wanted the console back, and no test in the family can accidentally
// become a statement about its own position in the file.
//
// Restoring `console.warn` in a `finally` is the smaller half and still
// load-bearing: a throw inside `run` would otherwise leave the host's console
// writing into an array nobody reads, and every later failure in that process
// prints nothing.
import { forgetUndescribedFormWarnings } from "@maroonedog/waypoint/resolver-standard";

/** Runs `run` with the host console captured, and returns what it printed. */
export const capturedWarnings = (run) => {
  forgetUndescribedFormWarnings();
  const original = console.warn;
  const lines = [];
  console.warn = (line) => lines.push(line);
  try {
    run();
  } finally {
    console.warn = original;
  }
  return lines;
};

/** The same capture, for a test that wants the value rather than the line. */
export const withoutWarnings = (run) => {
  let produced;
  capturedWarnings(() => {
    produced = run();
  });
  return produced;
};
