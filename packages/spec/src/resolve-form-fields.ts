// ===========================================================================
// resolve-form-fields.ts — the one entry point a renderer calls.
//
// Self-description wins over every resolver. The vendor that produced the
// schema knows what it declared; a resolver reads the same schema from
// outside and can only approximate it. Letting a resolver override would mean
// installing one silently downgrades every schema that was already exact.
//
// Resolvers are then tried in the order given, so a caller orders them to
// break ties between two that both claim a schema.
// ===========================================================================
import type { ErasedFormResolver } from "./form-resolver.types.js";
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";
import { hasStandardForm } from "./has-standard-form.js";
import { UnresolvableSchemaError } from "./unresolvable-schema-error.js";

const NONE: readonly ErasedFormResolver[] = Object.freeze([]);

/**
 * Describes a schema as form fields.
 *
 * @throws UnresolvableSchemaError when nothing can describe the schema.
 */
export function resolveFormFields(
  schema: unknown,
  resolvers: readonly ErasedFormResolver[] = NONE
): readonly FormFieldDescriptor[] {
  if (hasStandardForm(schema)) return schema["~form"].fields();
  for (const resolver of resolvers) {
    if (resolver.canResolve(schema)) return resolver.resolveFields(schema);
  }
  throw new UnresolvableSchemaError(resolvers.map((r) => r.vendor));
}
