// ===========================================================================
// zod-form-resolver.ts — describes a zod schema as form fields.
//
// Only an object schema is claimed. A form's value is a set of named fields,
// so a bare scalar schema has no field to name and claiming it would produce
// a form with one nameless input.
// ===========================================================================
import type { FormFieldDescriptor, FormResolver } from "form-contract";
import { collectZodFields } from "./collect-zod-fields.js";
import { readZodDefinition } from "./read-zod-definition.js";

/** A zod schema, recognised structurally rather than by its type. */
export interface ZodObjectSchema {
  readonly _zod?: unknown;
  readonly def?: unknown;
}

function isZodObjectSchema(schema: unknown): schema is ZodObjectSchema {
  const definition = readZodDefinition(schema);
  return definition !== undefined && definition.type === "object";
}

export const zodFormResolver: FormResolver<ZodObjectSchema> = {
  vendor: "zod",
  canResolve: isZodObjectSchema,
  resolveFields(schema: ZodObjectSchema): readonly FormFieldDescriptor[] {
    const definition = readZodDefinition(schema);
    if (definition === undefined) return [];
    const collected: FormFieldDescriptor[] = [];
    collectZodFields(definition, "", collected);
    return collected;
  },
};
