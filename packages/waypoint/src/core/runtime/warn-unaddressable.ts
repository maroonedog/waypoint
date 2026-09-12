// ===========================================================================
// warn-unaddressable.ts — a path the form does not have.
//
// WARNED, NOT THROWN. Such a field is inert: it draws nothing and validates
// nothing. It cannot let bad data through, because the pass judges the whole
// ROOT — the verdict and the submit gate stay correct and what broke is one
// field's display. Taking the whole form down for that would be the larger
// failure, and in TypeScript the typed hooks catch it before it ever runs.
//
// Once per path. A form re-renders, and a warning repeated on every keystroke
// is a warning nobody reads.
// ===========================================================================
import { declaredPathOf } from "../path/declared-path-of.js";
import type { AddressablePaths } from "../descriptors/addressable-paths.js";

/**
 * The `./core` entry declares no DOM and no Node types on purpose, so
 * `console` is not assumed to exist — it is used where a host provides one
 * and the diagnostic is simply skipped where none does. A runtime that
 * refuses to run because it could not print a warning would be worse than
 * the warning being missed.
 */
const warnOnHostConsole = (message: string): void => {
  const host = globalThis as { console?: { warn?: (line: string) => void } };
  host.console?.warn?.(message);
};

const alreadyWarned = new Set<string>();

/** Test seam: the warning is once per path for the life of the module. */
export const forgetUnaddressableWarnings = (): void => alreadyWarned.clear();

export function warnUnaddressable(
  path: string,
  addressable: AddressablePaths
): void {
  if (alreadyWarned.has(path)) return;
  alreadyWarned.add(path);
  const asRule = declaredPathOf(path);
  const similar = addressable.similarTo(path);
  warnOnHostConsole(
    `[waypoint] "${path}" is not a field this form has` +
      (asRule === path ? "" : ` (as a rule, "${asRule}")`) +
      ", so it will draw nothing and validate nothing." +
      (similar.length === 0 ? "" : ` Did you mean: ${similar.join(", ")}?`)
  );
}
