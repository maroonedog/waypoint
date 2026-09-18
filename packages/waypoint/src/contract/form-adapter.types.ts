// Descriptors and whole-root validation are the required adapter contract.
// Partial execution is optional because only the validator knows which rules
// depend on an edit. Its replacement scopes make error merging explicit.
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";
import type { FormIssue } from "./form-issue.types.js";
import type { MaybeAsync } from "./maybe-async.types.js";
import type { ValidationSignal } from "./validation-signal.types.js";

declare const adapterTypeIdentity: unique symbol;

/** A complete replacement verdict for the listed concrete subtrees. */
export interface PartialValidationResult<TCode extends string = string> {
  /** Include dependencies affected by the request; "" means the whole root. */
  readonly paths: readonly string[];
  /** All issues within those subtrees, including unchanged failures. */
  readonly issues: readonly FormIssue<TCode>[];
}

/** What one validator's schema offers a form runtime. */
export interface FormAdapter<
  T,
  TPath extends string = string,
  TCode extends string = string,
> {
  /**
   * Retains values and paths in structural comparisons, so incompatible
   * registrations cannot silently merge merely because both validate unknown.
   * Optional and type-only: adapters need not allocate or supply this member.
   */
  readonly [adapterTypeIdentity]?: { readonly values: T; readonly paths: TPath };
  /** The declared fields, in declaration order. */
  readonly fields: readonly FormFieldDescriptor[];
  /**
   * Optional incremental execution. Requested paths are concrete changed or
   * explicitly requested subtrees. Expand to all affected dependencies and
   * return complete verdicts for the replacement paths. Never return issues
   * outside those paths. Fall back to validate(root) with paths: [""] when
   * dependency-safe partial execution is impossible. Submit uses validate.
   */
  validatePartial?(
    root: unknown,
    paths: readonly string[],
    signal?: ValidationSignal
  ): MaybeAsync<PartialValidationResult<TCode>>;
  /**
   * Judges a whole root value and returns every issue, each at its concrete
   * path. Judging the whole root rather than one field is what lets a rule
   * that compares two fields report against either of them.
   *
   * A promise is allowed, for a rule that has to ask something. A vendor that
   * judges synchronously returns the list itself and nothing downstream pays
   * for the possibility — which is why this is one member that may be async
   * rather than a second member that always is.
   *
   * `signal` is aborted when a NEWER pass starts, so an async rule can stop a
   * round trip whose answer is already going to be discarded. An adapter that
   * declares neither validate's second parameter nor validatePartial's third
   * does not cause an AbortController to be constructed. An adapter that
   * DOES take it changes what a
   * superseded pass does: instead of resolving with an answer the runtime
   * drops, it rejects. The coalesced path already catches that; a caller who
   * awaits `form.validate()` and then edits the form will see the rejection.
   */
  validate(
    root: unknown,
    signal?: ValidationSignal
  ): MaybeAsync<readonly FormIssue<TCode>[]>;
}

/** The value type an adapter carries. */
export type FormValues<A> =
  A extends FormAdapter<infer T, string> ? T : never;

/** The paths an adapter permits. */
export type FormPaths<A> =
  A extends FormAdapter<infer _T, infer P> ? P : never;
