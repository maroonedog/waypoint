// ===========================================================================
// unwrap-zod-definition.ts — removes the wrappers that decide presence.
//
// `optional`, `nullish` and `default` all mean the form may be submitted with
// the field empty, so each one clears the requirement. `nullable` does not:
// null is a value the field must still carry, and a renderer that treated it
// as optional would drop the required mark from a field that has one.
//
// The loop unwraps repeatedly because the wrappers nest.
// ===========================================================================
import { readZodDefinition, type ZodDefinition } from "./read-zod-definition.js";

const CLEARS_REQUIREMENT: ReadonlySet<string> = new Set([
  "optional",
  "nullish",
  "default",
  "prefault",
]);

const TRANSPARENT: ReadonlySet<string> = new Set(["nullable", "readonly"]);

export interface UnwrappedZodDefinition {
  readonly definition: ZodDefinition;
  readonly isRequired: boolean;
}

/** The innermost definition, and whether a value must be supplied for it. */
export function unwrapZodDefinition(
  definition: ZodDefinition
): UnwrappedZodDefinition {
  let current = definition;
  let isRequired = true;
  for (;;) {
    const clears = CLEARS_REQUIREMENT.has(current.type);
    if (!clears && !TRANSPARENT.has(current.type)) {
      return { definition: current, isRequired };
    }
    if (clears) isRequired = false;
    const inner = readZodDefinition(current.innerType);
    if (inner === undefined) return { definition: current, isRequired };
    current = inner;
  }
}
