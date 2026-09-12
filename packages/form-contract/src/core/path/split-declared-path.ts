// ===========================================================================
// split-declared-path.ts — a declared path as members and wildcards.
//
// The concrete grammar has indices and this one has none, so they are read by
// different functions rather than by one that accepts both and has to be told
// which it is looking at.
// ===========================================================================

export type DeclaredSegment =
  | { readonly kind: "member"; readonly name: string }
  | { readonly kind: "each" };

/** `"items[*].sku"` becomes member items, each, member sku. */
export function splitDeclaredPath(
  declaredPath: string
): readonly DeclaredSegment[] {
  const segments: DeclaredSegment[] = [];
  for (const part of declaredPath.split(".")) {
    let name = part;
    while (name.endsWith("[*]")) name = name.slice(0, -3);
    if (name !== "") segments.push({ kind: "member", name });
    let depth = (part.length - name.length) / 3;
    while (depth > 0) {
      segments.push({ kind: "each" });
      depth -= 1;
    }
  }
  return segments;
}
