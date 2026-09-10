// ===========================================================================
// zod-form-resolver.ts — describes and judges a zod object schema.
//
// zod is imported for its TYPES only. `import type` is erased at build time,
// so the compiled output never mentions zod and installing this resolver
// cannot pull in a second copy or pin a version — while `z.infer` still gives
// the form the real value type rather than `unknown`.
//
// The paths come from the inferred type rather than from the schema, because
// every member of a zod schema is declared: for this vendor the shape IS the
// declaration, and there is no narrower set to offer.
// ===========================================================================
import type * as z from "zod";
import type {
  FieldPath,
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
} from "form-contract";
import { collectZodFields } from "./collect-zod-fields.js";
import { readZodDefinition } from "./read-zod-definition.js";
import {
  zodIssuesToFormIssues,
  type ZodIssueShape,
} from "./zod-issues-to-form-issues.js";

/** Builds a form adapter from a zod object schema. */
export function zodFormResolver<S extends z.ZodObject>(
  schema: S
): FormAdapter<z.infer<S>, FieldPath<z.infer<S>>> {
  const definition = readZodDefinition(schema);
  const fields: FormFieldDescriptor[] = [];
  if (definition !== undefined) collectZodFields(definition, "", fields);
  return {
    fields,
    validate(root: unknown): readonly FormIssue[] {
      const outcome = schema.safeParse(root);
      if (outcome.success) return [];
      const issues: readonly ZodIssueShape[] = outcome.error.issues;
      return zodIssuesToFormIssues(issues);
    },
  };
}
