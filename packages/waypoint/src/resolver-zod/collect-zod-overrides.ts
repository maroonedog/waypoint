// ===========================================================================
// collect-zod-overrides.ts — the two facts about a zod schema that its own
// JSON Schema does not carry.
//
// THIS FILE IS WHAT IS LEFT OF A WALK THAT USED TO BUILD EVERY DESCRIPTOR.
// zod's JSON Schema now supplies path, kind, presence, bounds, format, label
// and description — measured, not assumed: run against zod 4.6.4, the generic
// walk and the old hand-written one produced byte-identical descriptors for
// every field of every schema in test/zod-resolver.test.mjs, which when the
// measurement was taken also held the schemas that now live in
// test/zod-beyond-json-schema.test.mjs. Read the two together: the first is the
// corpus the shared path gets right unaided, the second is the residue this
// walk exists for, and a reader who wonders why a zod resolver still exists is
// looking at the second one.
//
// `date`, because `z.date()` is not representable in JSON Schema at all. zod
// throws on the whole document rather than the one field, and emits `{}` for
// it when `{ unrepresentable: "any" }` lets the document through — so the
// field survives as `kind: "unknown"` and the most common non-text widget in a
// real form loses its widget. Only zod knows a `{}` was a Date.
//
// Choice LABELS, because JSON Schema's `enum` is a list of VALUES and zod's
// enum has two sides. `z.enum({ Admin: "admin" })` puts the text a person
// reads on the key and the text stored on the value, and the document keeps
// only the second. Falling back to the value would silently change "Admin" to
// "admin" in the rendered option — UI text changing under a version bump,
// which is the one kind of regression a refinement is worth having.
//
// WHAT IS NOT HERE, DELIBERATELY: the safe-integer bounds `.int()` synthesises.
// zod spells `z.number().int()` as `minimum: -9007199254740991, maximum:
// 9007199254740991`, which would render `min="-9007199254740991"` on a number
// input — but recognising that needs no internals at all, only the two
// constants, so it is done on the finished descriptor in zod-form-resolver.ts
// and this walk stays the place where zod's PRIVATE shape is read.
//
// The walk reads `_zod.def`, and that is now a shrunken risk rather than a
// removed one. A zod internal rename used to empty every descriptor while
// validation kept working; now it costs a date widget and some option text on
// top of a descriptor list that is already correct.
// ===========================================================================
import type { FormFieldChoice } from "../contract/index.js";
import { readZodDefinition, type ZodDefinition } from "./read-zod-definition.js";
import { unwrapZodDefinition } from "./unwrap-zod-definition.js";

/** What a descriptor at this path should be told, beyond the document. */
export interface ZodFieldOverride {
  /** Present only when the JSON Schema could not say `date`. */
  readonly isDate?: true;
  /** Present only when the enum's keys differ from nothing usable. */
  readonly choices?: readonly FormFieldChoice[];
}

/**
 * `entries` is zod's key-to-value map for an enum. The key is the label
 * because that is the side an author writes for a reader; a non-drawable value
 * is skipped rather than stringified.
 */
function readChoices(
  definition: ZodDefinition
): readonly FormFieldChoice[] | undefined {
  const entries = definition.entries;
  if (entries === undefined) return undefined;
  const choices: FormFieldChoice[] = [];
  for (const [label, value] of Object.entries(entries)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      choices.push({ value, label });
    }
  }
  return choices.length === 0 ? undefined : choices;
}

const joinPath = (parent: string, key: string): string =>
  parent === "" ? key : `${parent}.${key}`;

/**
 * Records one entry per leaf that needs correcting, keyed by the same path
 * spelling the JSON Schema walk produces — dots for members, `[*]` for array
 * elements — so the two lists meet without either knowing the other's order.
 *
 * A leaf with nothing to correct is not recorded. An empty override would make
 * every field pay for the two that need one.
 */
export function collectZodOverrides(
  schema: unknown,
  path: string,
  collected: Map<string, ZodFieldOverride>
): void {
  const definition = readZodDefinition(schema);
  if (definition === undefined) return;
  const inner = unwrapZodDefinition(definition);

  if (inner.type === "object" && inner.shape !== undefined) {
    for (const [key, member] of Object.entries(inner.shape)) {
      collectZodOverrides(member, joinPath(path, key), collected);
    }
    return;
  }

  if (inner.type === "array" && readZodDefinition(inner.element) !== undefined) {
    collectZodOverrides(inner.element, `${path}[*]`, collected);
    return;
  }

  if (path === "") return;

  const choices = readChoices(inner);
  if (inner.type === "date") {
    collected.set(
      path,
      choices === undefined ? { isDate: true } : { isDate: true, choices }
    );
    return;
  }
  if (choices !== undefined) collected.set(path, { choices });
}
