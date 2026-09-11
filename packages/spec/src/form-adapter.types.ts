// ===========================================================================
// form-adapter.types.ts — the whole contract.
//
// One function per validator, named at the call site. There is no registry,
// no vendor tag and no dispatch, because whoever writes the call already knows
// which validator they are using; machinery to discover it would answer a
// question nobody asks.
//
// The type parameters are the reason this is not merely a list of
// descriptors. `T` is the form's value type and `TPath` the paths that may be
// addressed, so a misspelt path is a compile error rather than a field that
// silently never renders. Carrying them is also what keeps the contract
// neutral about direction: a type-first validator passes the type its rules
// were written against, a schema-first one passes what its schema infers, and
// both arrive as the same form.
//
// `fields` and `validate` travel together because a runtime needs both, and
// splitting them would make every vendor ship two adapters to be wired up in
// the right pairs.
// ===========================================================================
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";
import type { FormIssue } from "./form-issue.types.js";
import type { MaybeAsync } from "./maybe-async.types.js";

/** What one validator's schema offers a form runtime. */
export interface FormAdapter<T, TPath extends string = string> {
  /** The declared fields, in declaration order. */
  readonly fields: readonly FormFieldDescriptor[];
  /**
   * Judges a whole root value and returns every issue, each at its concrete
   * path. Judging the whole root rather than one field is what lets a rule
   * that compares two fields report against either of them.
   *
   * A promise is allowed, for a rule that has to ask something. A vendor that
   * judges synchronously returns the list itself and nothing downstream pays
   * for the possibility — which is why this is one member that may be async
   * rather than a second member that always is.
   */
  validate(root: unknown): MaybeAsync<readonly FormIssue[]>;
}

/**
 * Builds an adapter from one vendor's schema. The shape a caller writes is
 * `resolver(schema)`, so a resolver is a plain function and nothing more.
 */
export type FormResolver<TSchema, T, TPath extends string = string> = (
  schema: TSchema
) => FormAdapter<T, TPath>;

/** The value type an adapter carries. */
export type FormValues<A> =
  A extends FormAdapter<infer T, string> ? T : never;

/** The paths an adapter permits. */
export type FormPaths<A> =
  A extends FormAdapter<infer _T, infer P> ? P : never;
