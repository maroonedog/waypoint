// ===========================================================================
// luq-form-resolver.ts — describes and judges a luq validator.
//
// luq is imported for its TYPES only, so the compiled output never mentions it
// and installing this resolver cannot pull in a second copy or pin a version.
// The one runtime dependency is the validator the caller hands in, and the
// JSON Schema it can already produce.
//
// `abortEarly: false` is not a tuning knob here, it is the contract. This form
// runtime judges the WHOLE root once per settled change and scatters the
// verdict onto every path it names; a validator that stopped at the first
// failure would report one field and silently clear the rest, which is a form
// that hides its own errors. So the resolver asks for all of them and the
// caller does not get to choose.
// ===========================================================================
import type {
  FieldPath,
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
} from "form-contract";
import {
  collectJsonSchemaFields,
  type JsonSchemaNode,
} from "./json-schema-to-descriptors.js";
import { luqIssuesToFormIssues, type LuqIssueShape } from "./luq-issues-to-form-issues.js";

/** The half of a luq validator this resolver uses. */
export interface LuqValidatorShape<T> {
  validate(
    value: unknown,
    options?: { readonly abortEarly?: boolean }
  ): { readonly valid: boolean; readonly issues: readonly LuqIssueShape[] };
}

/**
 * The `~standard` a luq validator gets from `toStandardJsonSchema`. It is
 * taken as an argument rather than produced here: converting needs luq's own
 * module-scope recorder to have been installed, and a resolver that reached
 * for that would make importing it a side effect.
 */
export interface LuqJsonSchemaSource {
  readonly "~standard": {
    readonly jsonSchema: {
      readonly input: (options: { readonly target: string }) => Record<string, unknown>;
    };
  };
}

/**
 * Builds a form adapter from a luq validator and the schema it can describe.
 *
 * Two arguments rather than one because luq splits them: the validator judges,
 * and `toStandardJsonSchema(validator)` describes. Passing both keeps this
 * package free of any import that would execute luq code at load time.
 */
export function luqFormResolver<T extends object>(
  validator: LuqValidatorShape<T>,
  describable: LuqJsonSchemaSource
): FormAdapter<T, FieldPath<T>> {
  const document = describable["~standard"].jsonSchema.input({
    target: "draft-07",
  }) as JsonSchemaNode;

  const fields: FormFieldDescriptor[] = [];
  collectJsonSchemaFields(document, "", true, fields);

  return {
    fields,
    validate(root: unknown): readonly FormIssue[] {
      const outcome = validator.validate(root, { abortEarly: false });
      return luqIssuesToFormIssues(outcome.issues);
    },
  };
}
