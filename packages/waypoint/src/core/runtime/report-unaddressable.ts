// ===========================================================================
// report-unaddressable.ts — a path the form does not have.
//
// WARNED BY DEFAULT, NOT THROWN. Such a field is inert: it draws nothing and
// validates nothing. It cannot let bad data through, because the pass judges
// the whole ROOT — the verdict and the submit gate stay correct and what broke
// is one field's display. Taking the whole form down for that would be the
// larger failure, and in TypeScript the typed hooks catch it before it runs.
//
// AND THROWN WHERE THE CALLER ASKS FOR IT, because the paragraph above is an
// argument about an application whose author is watching. A path that resolves
// to nothing is also what a writer who has not read the schema produces, and
// for that writer a warning in a console nobody opened is indistinguishable
// from success. `onFieldMismatch: "throw"` is how a test, a CI run, or anyone
// who would rather be stopped than informed says so.
//
// Once per path when it warns. A form re-renders, and a warning repeated on
// every keystroke is a warning nobody reads. A throw is not deduplicated,
// because it does not repeat: it ends the call that made it.
// ===========================================================================
import { declaredPathOf } from "../path/declared-path-of.js";
import type { AddressablePaths } from "../descriptors/addressable-paths.js";

/**
 * What a form does when its paths and its components disagree.
 *
 * `"ignore"` turns both of them off. It is not the answer for a screen that
 * draws part of a form on purpose — that screen says `partial` on its own
 * provider and keeps every other check — but a diagnostic with no way to be
 * switched off is one that gets switched off by deleting its caller.
 */
export type FieldMismatchReaction = "warn" | "throw" | "ignore";

/**
 * The `./core` entry declares no DOM and no Node types on purpose, so
 * `console` is not assumed to exist — it is used where a host provides one
 * and the diagnostic is simply skipped where none does. A runtime that
 * refuses to run because it could not print a warning would be worse than
 * the warning being missed.
 */
export const warnOnHostConsole = (message: string): void => {
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

const unaddressableMessage = (
  path: string,
  addressable: AddressablePaths,
  key: string | undefined
): string => {
  const asWritten = qualifiedBy(key);
  const asRule = declaredPathOf(path);
  const similar = addressable.similarTo(path).map(asWritten);
  return (
    `[waypoint] "${asWritten(path)}" is not a field this form has` +
    (asRule === path ? "" : ` (as a rule, "${asWritten(asRule)}")`) +
    ", so it will draw nothing and validate nothing." +
    (similar.length === 0 ? "" : ` Did you mean: ${similar.join(", ")}?`)
  );
};

export function reportUnaddressable(
  path: string,
  addressable: AddressablePaths,
  key: string | undefined,
  reaction: FieldMismatchReaction
): void {
  if (reaction === "ignore") return;
  const message = unaddressableMessage(path, addressable, key);
  if (reaction === "throw") throw new Error(message);
  const spelling = qualifiedBy(key)(path);
  if (alreadyWarned.has(spelling)) return;
  alreadyWarned.add(spelling);
  warnOnHostConsole(message);
}
