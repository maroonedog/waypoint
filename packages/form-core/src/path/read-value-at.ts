// ===========================================================================
// read-value-at.ts — the value at a concrete path, or undefined.
//
// Only OWN properties are read. A form value is data, and reaching an
// inherited member would let `constructor` or `toString` answer for a field
// that was never declared.
// ===========================================================================
import { splitConcretePath, type PathSegment } from "./concrete-path.js";

const step = (holder: unknown, segment: PathSegment): unknown => {
  if (holder === null || typeof holder !== "object") return undefined;
  if (segment.kind === "index") {
    return Array.isArray(holder) ? holder[segment.index] : undefined;
  }
  return Object.prototype.hasOwnProperty.call(holder, segment.name)
    ? (holder as Record<string, unknown>)[segment.name]
    : undefined;
};

export function readValueAt(root: unknown, path: string): unknown {
  let current = root;
  for (const segment of splitConcretePath(path)) {
    current = step(current, segment);
    if (current === undefined) return undefined;
  }
  return current;
}
