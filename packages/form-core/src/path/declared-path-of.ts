// ===========================================================================
// declared-path-of.ts — the shape a concrete path belongs to.
//
// `items[3].quantity` is one place in one value; `items[*].quantity` is the
// rule that place obeys. Descriptors are keyed by the second, and every lookup
// from a live field arrives holding the first, so the conversion happens here
// and in one direction only.
//
// Every index becomes a wildcard, including one nested inside another array.
// A descriptor never carries an index, so an index that survived the
// conversion would simply fail to match.
// ===========================================================================
import { splitConcretePath, type PathSegment } from "./concrete-path.js";

const asDeclared = (segments: readonly PathSegment[]): string => {
  let declared = "";
  for (const segment of segments) {
    if (segment.kind === "index") declared += "[*]";
    else declared = declared === "" ? segment.name : `${declared}.${segment.name}`;
  }
  return declared;
};

/** `"items[3].quantity"` becomes `"items[*].quantity"`. */
export function declaredPathOf(concretePath: string): string {
  return concretePath.includes("[")
    ? asDeclared(splitConcretePath(concretePath))
    : concretePath;
}
