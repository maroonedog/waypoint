// ===========================================================================
// write-value-at.ts — a copy of the root with one path replaced.
//
// Copy-on-write along the touched spine only. Every untouched branch keeps its
// identity, which is what lets a reader compare with Object.is and conclude
// that nothing below it moved.
//
// Members are placed with defineProperty rather than assignment. A form value
// can carry a key literally named `__proto__`, and assigning it would write
// the prototype instead of the field.
// ===========================================================================
import { splitConcretePath, type PathSegment } from "./concrete-path.js";

const emptyFor = (segment: PathSegment | undefined): unknown =>
  segment !== undefined && segment.kind === "index" ? [] : {};

const place = (holder: unknown, segment: PathSegment, next: unknown): unknown => {
  if (segment.kind === "index") {
    const copy = Array.isArray(holder) ? [...holder] : [];
    copy[segment.index] = next;
    return copy;
  }
  const source =
    holder !== null && typeof holder === "object" && !Array.isArray(holder)
      ? (holder as Record<string, unknown>)
      : {};
  const copy: Record<string, unknown> = { ...source };
  Object.defineProperty(copy, segment.name, {
    value: next,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return copy;
};

const readForDescent = (holder: unknown, segment: PathSegment): unknown => {
  if (holder === null || typeof holder !== "object") return undefined;
  if (segment.kind === "index") {
    return Array.isArray(holder) ? holder[segment.index] : undefined;
  }
  return Object.prototype.hasOwnProperty.call(holder, segment.name)
    ? (holder as Record<string, unknown>)[segment.name]
    : undefined;
};

function placeAt(
  holder: unknown,
  segments: readonly PathSegment[],
  at: number,
  next: unknown
): unknown {
  const segment = segments[at];
  if (segment === undefined) return next;
  const existing = readForDescent(holder, segment);
  const descended =
    existing === undefined && at + 1 < segments.length
      ? emptyFor(segments[at + 1])
      : existing;
  return place(holder, segment, placeAt(descended, segments, at + 1, next));
}

/** The root with `path` set to `next`; the original is not modified. */
export function writeValueAt(root: unknown, path: string, next: unknown): unknown {
  const segments = splitConcretePath(path);
  if (segments.length === 0) return next;
  const base =
    root === null || typeof root !== "object" ? emptyFor(segments[0]) : root;
  return placeAt(base, segments, 0, next);
}
