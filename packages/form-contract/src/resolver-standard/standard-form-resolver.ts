// ===========================================================================
// standard-form-resolver.ts — one resolver, for every validator that speaks
// the two specs.
//
// THIS IS WHAT MAKES THE CONTRACT'S NEUTRALITY STRUCTURAL. It used to be
// demonstrated by writing a second resolver by hand, which proves only that
// two can be written. Here both members come from specs nobody in this package
// owns: `fields` from `~standard.jsonSchema.input()`, walked by the same
// format-reading code every vendor gets, and `validate` from
// `~standard.validate`. A vendor that implements both is already supported,
// with no file added here and no release of this package.
//
// UNARY, because every vendor that needs a wrapper returns ONE object carrying
// both halves. Run here, `toStandardJsonSchema(validator)` on luq 2.4.4 hands
// back a new object whose keys are `validate, parse, pick, pickAll, ~standard`
// — luq's own judging method AND the spec's two members on the same value — so
// there is no second argument to take. The separately-built describable is not
// a second parameter; it IS the argument.
//
// TWO OVERLOADS, and the second one is the degradation. A vendor that
// implements only `~standard.validate` cannot satisfy the first, so the
// compiler stops the call and names `jsonSchema` as what is missing — before
// anything runs, at no runtime cost, and without a third member on
// `FormAdapter` that every vendor would have to fill in and almost no caller
// would read. Such a vendor reaches the second overload by passing the fields
// itself, which is the honest shape of that situation: the validator did not
// describe the form, so somebody else must.
//
// `types` is INPUT, not output. A form edits the value going in — the string
// in the box before a transform coerces it — and `jsonSchema.input()`
// describes that same side, so the two halves agree about what `T` is.
// ===========================================================================
import type {
  FieldPath,
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
  MaybeAsync,
} from "../contract/index.js";
import { collectJsonSchemaFields } from "./json-schema-to-descriptors.js";
import { readStandardJsonSchema } from "./read-standard-json-schema.js";
import {
  mapStandardVerdict,
  standardResultToFormIssues,
} from "./standard-issues-to-form-issues.js";
import type {
  StandardInput,
  StandardJsonSchemaConverter,
  StandardSchemaV1,
  StandardSchemaWithJSON,
  StandardValidatorProps,
} from "./standard-schema.types.js";
import { warnUndescribedForm } from "./warn-undescribed-form.js";

/** What a caller may say that the two specs cannot carry. */
export interface StandardFormOptions {
  /**
   * Passed to `jsonSchema.input()` verbatim and never invented. It is the
   * vendor's own vocabulary: `{ unrepresentable: "any" }` is a word zod knows
   * and no other library does, so a resolver that guessed one would be sending
   * an unknown library a key it is entitled to reject.
   */
  readonly libraryOptions?: Record<string, unknown> | undefined;
}

/** The fields a validator could not describe, supplied by the caller. */
export interface DeclaredFormFields {
  readonly fields: readonly FormFieldDescriptor[];
}

/**
 * The paths a value type permits, or any string when the vendor declared no
 * type. `types` is optional in the spec, so a vendor that omits it degrades to
 * an untyped form rather than to `never` — which would be a path union no
 * string satisfies, making every typed hook a compile error.
 *
 * Exported because it is the degradation RULE and not this resolver's private
 * arrangement: a vendor resolver that builds its own return type has to reach
 * the same answer for the same validator, and `resolver-luq` reached `never`
 * for a while by writing `FieldPath<T>` directly.
 */
export type StandardPaths<Input> = [FieldPath<Input>] extends [never]
  ? string
  : FieldPath<Input>;

/**
 * The implementation's view of `~standard`: it has been handed a validator by
 * one of two overloads and cannot know which, so `jsonSchema` is optional here
 * rather than absent. Written as an optional member instead of asserted at the
 * read, because an optional member is a fact the compiler keeps enforcing —
 * every use has to survive its absence — and a cast is one the compiler stops
 * looking at.
 */
interface PossiblyDescribingProps extends StandardValidatorProps<unknown> {
  readonly jsonSchema?: StandardJsonSchemaConverter | undefined;
}

/** Builds a form adapter from a validator that also describes itself. */
export function standardFormResolver<S extends StandardSchemaWithJSON>(
  schema: S,
  options?: StandardFormOptions
): FormAdapter<StandardInput<S>, StandardPaths<StandardInput<S>>>;
/**
 * Builds a form adapter from a validator that judges but does not describe,
 * with the fields supplied by the caller.
 */
export function standardFormResolver<S extends StandardSchemaV1>(
  schema: S,
  options: StandardFormOptions & DeclaredFormFields
): FormAdapter<StandardInput<S>, StandardPaths<StandardInput<S>>>;
export function standardFormResolver(
  schema: StandardSchemaV1,
  options: StandardFormOptions & Partial<DeclaredFormFields> = {}
): FormAdapter<unknown, string> {
  const properties = schema["~standard"];
  return {
    fields: options.fields ?? describeStandardFields(properties, options),
    validate(root: unknown): MaybeAsync<readonly FormIssue[]> {
      return mapStandardVerdict(
        properties.validate(root),
        standardResultToFormIssues
      );
    },
  };
}

/**
 * The descriptors, or none of them and a sentence saying which way the vendor
 * declined. An empty list is returned in every failing case rather than thrown,
 * because a form that validates and draws nothing is the better failure — see
 * warn-undescribed-form.ts.
 */
function describeStandardFields(
  properties: PossiblyDescribingProps,
  options: StandardFormOptions
): readonly FormFieldDescriptor[] {
  const declaration = readStandardJsonSchema(
    properties.jsonSchema,
    options.libraryOptions
  );
  if (declaration.state !== "declared") {
    warnUndescribedForm(properties.vendor, declaration);
    return [];
  }

  const collected: FormFieldDescriptor[] = [];
  collectJsonSchemaFields(declaration.document, "", true, collected);
  if (collected.length === 0) {
    warnUndescribedForm(properties.vendor, { state: "empty" });
  }
  return collected;
}
