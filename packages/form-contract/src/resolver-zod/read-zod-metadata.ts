// ===========================================================================
// read-zod-metadata.ts — reaches a zod schema's declared title and
// description without importing zod.
//
// zod 4 keeps neither on the definition. `.describe(text)` and
// `.meta({ title, description })` both clone the schema and call
// `globalRegistry.add(clone, meta)`, so the text lives in a registry keyed by
// the SCHEMA OBJECT and `_zod.def` carries nothing of it. That is why this
// function takes a schema rather than a `ZodDefinition`, and why the walk in
// collect-zod-fields.ts had to start carrying schemas to call it.
//
// The registry is reached through `globalThis.__zod_globalRegistry` — the same
// global zod installs and reuses — for the reason read-zod-definition.ts
// gives: importing zod would let a second copy be installed or pin the caller
// to a version. The cost is the same too, and the guards below pay it.
//
// `get` is called rather than its backing map read directly, because zod
// inherits metadata along a schema's `_zod.parent` chain and a later check
// clones: `z.string().describe("d").min(3)` leaves the text on the parent.
//
// A wrapper is walked through because zod does NOT inherit across one —
// `.optional()` constructs a new schema and leaves its parent unset. So
// `z.string().describe("d").optional()` carries the text on the inner schema
// and `z.string().optional().describe("d")` on the outer, and only walking
// finds both. Each member is taken from the outermost schema that declares
// it, which makes a wrapper's own title an override rather than a duplicate.
// ===========================================================================
import { readZodDefinition } from "./read-zod-definition.js";

/** The declared text of one field. A member is absent when unstated. */
export interface ZodMetadata {
  readonly title?: string;
  readonly description?: string;
}

/** As much of `$ZodRegistry` as is used here. */
interface ZodMetadataRegistry {
  get(schema: unknown): unknown;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

function globalZodRegistry(): ZodMetadataRegistry | undefined {
  const globals = globalThis as unknown as Record<string, unknown>;
  const candidate = asRecord(globals["__zod_globalRegistry"]);
  if (candidate === undefined) return undefined;
  return typeof candidate["get"] === "function"
    ? (candidate as unknown as ZodMetadataRegistry)
    : undefined;
}

/**
 * zod's `get` reads `schema._zod.parent` on its way up and throws on anything
 * that is not one of its schemas. A structural reader cannot promise it was
 * handed one, so a throw is read as "no metadata" rather than propagated: a
 * missing label must not stop a form being described.
 */
function entryFor(
  registry: ZodMetadataRegistry,
  schema: unknown
): Record<string, unknown> | undefined {
  try {
    return asRecord(registry.get(schema));
  } catch {
    return undefined;
  }
}

/**
 * The title and description this schema declares, looking through the
 * presence wrappers. Either member is absent when the schema never said it —
 * a title is never invented from the path.
 *
 * A non-string title is ignored rather than stringified: `meta` accepts any
 * JSON, and a renderer asked to draw `[object Object]` as a field's name is
 * worse off than one told there is no name.
 */
export function readZodMetadata(schema: unknown): ZodMetadata {
  const registry = globalZodRegistry();
  if (registry === undefined) return {};

  const found: { title?: string; description?: string } = {};
  let current: unknown = schema;
  for (;;) {
    const entry = entryFor(registry, current);
    if (entry !== undefined) {
      const title = entry["title"];
      const description = entry["description"];
      if (found.title === undefined && typeof title === "string") {
        found.title = title;
      }
      if (found.description === undefined && typeof description === "string") {
        found.description = description;
      }
    }
    const inner = readZodDefinition(current)?.innerType;
    if (inner === undefined) return found;
    current = inner;
  }
}
