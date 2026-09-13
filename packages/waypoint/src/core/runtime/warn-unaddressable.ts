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

/**
 * SEARCHED ON THE BARE PATH, QUOTED WITH THE FORM IN FRONT OF IT, and those
 * have to be two different strings.
 *
 * The reader searches their own source for what they typed. A form's own
 * vocabulary is the paths it declares, so the resemblance is looked for in
 * that vocabulary and the name goes back on afterwards — onto the suggestions
 * as well — so that the whole line reads in one of them.
 *
 * WHICH NAME, and this is the limit: the one in `FormOptions.key`, because
 * `./core` has no context to read. An application that named the form at the
 * PROVIDER instead gets bare quotes and bare suggestions here while having
 * written a qualified path, and cannot paste them back. Naming the form where
 * it is created is what buys the prefix in these messages.
 *
 * Skipping the second half would be the worse half to skip. A qualified
 * spelling handed to a search over unqualified paths resembles none of them,
 * so the suggestions are lost exactly where one is most wanted.
 */
const qualifiedBy =
  (key: string | undefined) =>
  (path: string): string =>
    key === undefined ? path : `${key}:${path}`;

export function warnUnaddressable(
  path: string,
  addressable: AddressablePaths,
  key?: string
): void {
  const asWritten = qualifiedBy(key);
  const spelling = asWritten(path);
  if (alreadyWarned.has(spelling)) return;
  alreadyWarned.add(spelling);
  const asRule = declaredPathOf(path);
  const similar = addressable.similarTo(path).map(asWritten);
  warnOnHostConsole(
    `[waypoint] "${spelling}" is not a field this form has` +
      (asRule === path ? "" : ` (as a rule, "${asWritten(asRule)}")`) +
      ", so it will draw nothing and validate nothing." +
      (similar.length === 0 ? "" : ` Did you mean: ${similar.join(", ")}?`)
  );
}
