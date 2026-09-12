// ===========================================================================
// luq-form-resolver.ts — judges a luq validator with luq's own verdict, and
// lets the generic resolver describe it.
//
// WHAT IS LEFT HERE IS ONLY WHAT THE SPECS CANNOT CARRY. The descriptor half
// is gone: it was `collectJsonSchemaFields` over `~standard.jsonSchema`, which
// is now exactly what `standardFormResolver` does for every vendor, so keeping
// a copy would have been two names for one behaviour. What luq still has that
// the spec has no room for is `code` — and the reason is written in luq's own
// bridge, at `@maroonedog/luq/dist/standard-schema/to-standard-schema.mjs`,
// which says `code` and `severity` "have nowhere to go in the spec, so they
// are dropped". Read here on luq 2.4.4: the same failing root gives
// `code: "stringMin"` through `validator.validate` and no `code` at all
// through `~standard.validate`. An application that replaces a message by
// matching its code needs the first, so this file keeps it.
//
// SEVERITY IS THE OTHER ONE. luq grades an issue and the spec does not, so
// only errors reach the form: a warning that blocked a submit would be a
// warning that is an error.
//
// UNARY NOW, and that is a correction rather than a convenience. It used to
// take `(validator, describable)` on the grounds that luq judges with one
// object and describes with another. Run here, that is not so:
// `toStandardJsonSchema(validator)` returns a NEW object whose keys are
// `validate, parse, pick, pickAll, ~standard` — luq's native judging method
// travels on the same value as the spec's two members, and calling
// `describable.validate(root, { abortEarly: false })` off it returns luq's full
// issues, codes and severities intact. So one argument was always enough.
//
// `abortEarly: false` is not a tuning knob, it is the contract. This form
// runtime judges the WHOLE root once per settled change and scatters the
// verdict onto every path it names; a validator that stopped at the first
// failure would report one field and silently clear the rest, which is a form
// that hides its own errors. So the resolver asks for all of them and the
// caller does not get to choose.
// ===========================================================================
import type { FormAdapter, FormIssue } from "../contract/index.js";
import {
  standardFormResolver,
  type StandardFormOptions,
  type StandardPaths,
  type StandardSchemaWithJSON,
} from "../resolver-standard/index.js";
import {
  luqIssuesToFormIssues,
  type LuqIssueShape,
} from "./luq-issues-to-form-issues.js";

/**
 * What `toStandardJsonSchema(validator)` hands back: the spec's two members,
 * and luq's own `validate` beside them.
 *
 * luq is named in no import, so the compiled output never mentions it and
 * installing this resolver cannot pull in a second copy or pin a version. The
 * one runtime dependency is the object the caller hands in.
 */
export interface LuqDescribableValidator<T> extends StandardSchemaWithJSON<T> {
  validate(
    value: unknown,
    options?: { readonly abortEarly?: boolean }
  ): { readonly valid: boolean; readonly issues: readonly LuqIssueShape[] };
}

/**
 * Builds a form adapter from the object `toStandardJsonSchema(validator)`
 * returns.
 *
 * The describable is taken as an argument rather than produced here, and that
 * has outlived the arity it used to justify: converting needs luq's own
 * module-scope recorder to have been installed, and a resolver that reached
 * for it would make importing this file a side effect.
 *
 * `T` is inferred off `~standard.types`, so a built luq validator carries its
 * own model here and `luqFormResolver<Order>(…)` is no longer the only
 * spelling that works. The paths go through `StandardPaths` for the case where
 * it is NOT inferrable: a validator declaring no `types` leaves `T` at its
 * `object` constraint, and `FieldPath<object>` is `never` — a path union no
 * string satisfies, which turns every hook on that form into a compile error.
 * This file wrote `FieldPath<T>` directly and produced exactly that, while
 * `standardFormResolver` handed the same validator back a `string`. Two
 * resolvers in one package disagreeing about one validator is the defect;
 * naming the rule in one place is the fix.
 */
export function luqFormResolver<T extends object>(
  describable: LuqDescribableValidator<T>,
  options?: StandardFormOptions
): FormAdapter<T, StandardPaths<T>> {
  const described = standardFormResolver(describable, options);
  return {
    fields: described.fields,
    validate(root: unknown): readonly FormIssue[] {
      const outcome = describable.validate(root, { abortEarly: false });
      return luqIssuesToFormIssues(outcome.issues);
    },
  };
}
