// ===========================================================================
// path-relation.ts — whether one path lies under another.
//
// The test is SEGMENT-ANCHORED, never a bare prefix match. `"a"` is not an
// ancestor of `"abc"`, and a runtime that decides it is wakes every field
// whose name happens to start with the same letters — a defect that is
// invisible until a form is large enough for it to matter.
// ===========================================================================

/** True when `descendant` names something inside `ancestor`. */
export function isAncestorPath(ancestor: string, descendant: string): boolean {
  if (ancestor === "" || ancestor === descendant) return false;
  if (!descendant.startsWith(ancestor)) return false;
  const boundary = descendant[ancestor.length];
  return boundary === "." || boundary === "[";
}

/** Every path from the outermost member down to, but excluding, `path`. */
export function ancestorPathsOf(path: string): readonly string[] {
  const ancestors: string[] = [];
  for (let position = 1; position < path.length; position += 1) {
    const character = path[position];
    if (character === "." || character === "[") {
      const candidate = path.slice(0, position);
      if (candidate !== "") ancestors.push(candidate);
    }
  }
  return ancestors;
}
