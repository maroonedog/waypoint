// ===========================================================================
// assert-dom-shape-matches.ts — proof 5.
//
// A subject that renders fewer nodes is cheaper for a reason that has nothing
// to do with its form runtime. Each equal-tree subject is hashed after the
// same normalisation and a mismatch aborts the run.
//
// Observable state is REMOVED before hashing: value, defaultValue, checked and
// aria-invalid are what the agreement channels compare, and leaving them in
// would make a correct disagreement look like a structural one.
// ===========================================================================
import { createHash } from "node:crypto";

export class DomShapeMismatchError extends Error {
  constructor(first: string, second: string, detail: string) {
    super(
      `"${first}" and "${second}" render different DOM, so their counts are ` +
        `not comparable. ${detail}`
    );
    this.name = "DomShapeMismatchError";
  }
}

const STATE_ATTRIBUTES = new Set([
  "value",
  "defaultvalue",
  "checked",
  "aria-invalid",
]);

const normalise = (element: Element): string => {
  const attributes = Array.from(element.attributes)
    .filter((attribute) => !STATE_ATTRIBUTES.has(attribute.name.toLowerCase()))
    .map((attribute) => `${attribute.name}`)
    .sort()
    .join(",");
  const children = Array.from(element.children).map(normalise).join("");
  return `<${element.tagName.toLowerCase()} ${attributes}>${children}`;
};

export const hashDomShape = (container: Element): string =>
  createHash("sha256")
    .update(Array.from(container.children).map(normalise).join(""))
    .digest("hex")
    .slice(0, 16);

export function assertDomShapeMatches(
  shapes: ReadonlyMap<string, string>
): void {
  const entries = [...shapes.entries()];
  const first = entries[0];
  if (first === undefined) return;
  for (const [subjectId, hash] of entries.slice(1)) {
    if (hash !== first[1]) {
      throw new DomShapeMismatchError(
        first[0],
        subjectId,
        `${first[1]} against ${hash}.`
      );
    }
  }
}
