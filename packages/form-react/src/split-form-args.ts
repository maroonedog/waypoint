// ===========================================================================
// split-form-args.ts — "did this call name a form?", answered in one place.
//
// Every hook here takes either `(path)` or `(key, path)`. Which one it was is
// decided by arity and nothing else, so a path is never mistaken for a key and
// the six hooks cannot drift apart on the question.
// ===========================================================================

/** @returns the key the call named, if any, and the path it asked for. */
export const splitFormArgs = (
  first: string,
  second: string | undefined
): readonly [key: string | undefined, path: string] =>
  second === undefined ? [undefined, first] : [first, second];
