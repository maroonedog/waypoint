// ===========================================================================
// unwrap-zod-definition.ts — looks through the wrappers to the definition
// that carries the shape.
//
// IT NO LONGER DECIDES PRESENCE, and losing that job is the point. It used to
// return an `isRequired` beside the definition, worked out from which wrappers
// it passed — `optional`, `nullish` and `default` clear the requirement,
// `nullable` does not, because null is a value the field must still carry.
// Every one of those rules is now answered by the `required` list in zod's own
// JSON Schema, which is zod's reading of its own wrappers rather than this
// package's imitation of it. Two readings of one fact is the arrangement where
// they get to disagree, so this one was deleted rather than kept in reserve.
//
// What is left is the reason a wrapper is looked through at all: `z.date()
// .optional()` has `type: "optional"` on the outside, and the fact worth
// knowing — that there is a Date in there — is underneath. The loop unwraps
// repeatedly because the wrappers nest.
// ===========================================================================
import { readZodDefinition, type ZodDefinition } from "./read-zod-definition.js";

/** The wrappers that describe presence or access rather than shape. */
const WRAPPERS: ReadonlySet<string> = new Set([
  "optional",
  "nullish",
  "default",
  "prefault",
  "nullable",
  "readonly",
]);

/** The innermost definition, with the wrappers taken off. */
export function unwrapZodDefinition(definition: ZodDefinition): ZodDefinition {
  let current = definition;
  for (;;) {
    if (!WRAPPERS.has(current.type)) return current;
    const inner = readZodDefinition(current.innerType);
    if (inner === undefined) return current;
    current = inner;
  }
}
