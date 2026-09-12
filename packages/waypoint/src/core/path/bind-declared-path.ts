// ===========================================================================
// bind-declared-path.ts — a declared path plus the indices to read it at.
//
// The indices are supplied in the order the wildcards appear, so a nested
// array is bound by listing the outer index first. A path with more wildcards
// than indices is left partly bound rather than guessed at: the caller is
// inside fewer row scopes than the path needs, and inventing a zero would
// silently address the first row of something the caller never entered.
// ===========================================================================

const WILDCARD = "[*]";

/**
 * Replaces each `[*]` with the next index.
 *
 * @returns the concrete path, or undefined when there were not enough indices.
 */
export function bindDeclaredPath(
  declaredPath: string,
  indices: readonly number[]
): string | undefined {
  let bound = "";
  let rest = declaredPath;
  let taken = 0;
  for (;;) {
    const at = rest.indexOf(WILDCARD);
    if (at === -1) return bound + rest;
    const index = indices[taken];
    if (index === undefined) return undefined;
    bound += `${rest.slice(0, at)}[${index}]`;
    rest = rest.slice(at + WILDCARD.length);
    taken += 1;
  }
}
