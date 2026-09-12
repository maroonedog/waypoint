// ===========================================================================
// concrete-path.ts — the grammar of a path that addresses one value.
//
// Concrete means every array step names a real index: `items[3].quantity`, not
// `items[*].quantity`. A wildcard describes the shape and a concrete path
// describes one place in one value, so they are different languages and this
// file speaks only the second.
//
// Scanned character by character rather than matched with a RegExp. A pattern
// built from a path is a compiled string, and compiling a string is what this
// library promises never to do.
//
// The grammar has no escape, so a member whose name contains a dot or a
// bracket cannot be addressed: the key `"a.b"` is read as `a` then `b`. An
// escape would have to be understood by every path a vendor emits as well, and
// no vendor spells one today, so the limit is stated rather than papered over.
// ===========================================================================

export type PathSegment =
  | { readonly kind: "member"; readonly name: string }
  | { readonly kind: "index"; readonly index: number };

/** `"items[3].quantity"` becomes member, index, member. */
export function splitConcretePath(path: string): readonly PathSegment[] {
  const segments: PathSegment[] = [];
  let pending = "";
  let position = 0;

  const flushMember = (): void => {
    if (pending !== "") {
      segments.push({ kind: "member", name: pending });
      pending = "";
    }
  };

  while (position < path.length) {
    const character = path[position];
    if (character === ".") {
      flushMember();
      position += 1;
      continue;
    }
    if (character === "[") {
      flushMember();
      const close = path.indexOf("]", position);
      if (close === -1) {
        pending += character;
        position += 1;
        continue;
      }
      const inside = path.slice(position + 1, close);
      const index = Number(inside);
      segments.push(
        inside !== "" && Number.isInteger(index)
          ? { kind: "index", index }
          : { kind: "member", name: inside }
      );
      position = close + 1;
      continue;
    }
    pending += character;
    position += 1;
  }
  flushMember();
  return segments;
}

export function joinConcretePath(segments: readonly PathSegment[]): string {
  let path = "";
  for (const segment of segments) {
    if (segment.kind === "index") {
      path += `[${segment.index}]`;
    } else {
      path = path === "" ? segment.name : `${path}.${segment.name}`;
    }
  }
  return path;
}
