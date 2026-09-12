// ===========================================================================
// read-zod-definition.ts — reaches a zod schema's definition without
// importing zod.
//
// Reading structurally rather than through zod's types keeps zod out of the
// dependency list, so installing this resolver cannot pull in a second copy
// of zod or pin the caller to a version. The cost is that the shape read here
// is not checked by zod's own types; the guards below are what pay it.
//
// Two spellings are accepted because the definition moved between major
// versions. Neither is preferred: whichever is present is the one this schema
// carries.
// ===========================================================================

/** A zod definition, as much of it as is read here. */
export interface ZodDefinition {
  readonly type: string;
  readonly shape?: Readonly<Record<string, unknown>>;
  readonly checks?: readonly unknown[];
  readonly entries?: Readonly<Record<string, unknown>>;
  readonly innerType?: unknown;
  readonly element?: unknown;
  readonly format?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

/** The definition, or undefined when the value is not a zod schema. */
export function readZodDefinition(schema: unknown): ZodDefinition | undefined {
  const holder = asRecord(schema);
  if (holder === undefined) return undefined;
  const internals = asRecord(holder["_zod"]);
  const candidate = asRecord(internals?.["def"]) ?? asRecord(holder["def"]);
  if (candidate === undefined) return undefined;
  return typeof candidate["type"] === "string"
    ? (candidate as unknown as ZodDefinition)
    : undefined;
}
