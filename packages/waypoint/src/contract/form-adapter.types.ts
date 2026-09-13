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
//
// There is still no `FormResolver` type here, and the reason has changed. It
// used to be that the type was refuted by a shipped resolver: it said a
// resolver is `(schema) => FormAdapter`, and `luqFormResolver` was binary
// because luq appeared to judge with one object and describe with another. That
// example is gone — the object `toStandardJsonSchema` returns carries both, so
// every resolver in this package is unary now, and a type saying so would
// finally be true of all three.
//
// It stays absent anyway, because being true of today's three is not what such
// a type would be claiming. `standardFormResolver` is `(schema, options?)`,
// where `options` is required for a vendor that cannot describe itself; a
// vendor arriving tomorrow may need a call this package has not imagined; and
// the type would have to be widened for each, which is a type that describes
// what has already been written rather than one that constrains what may be.
// Arity was never the part worth promising, and nothing ever referenced it:
// zero call sites, zero type tests. What every vendor agrees to is the two
// members below, and that is the whole contract.
//
// `validate` GREW A SECOND ARGUMENT, AND THE FILE THAT REFUSES MEMBERS OWES A
// REASON FOR IT. What was asked for was a `debounceMs` knob, and it does not
// port. TanStack debounces ONE ASYNC VALIDATOR, per cause, and forces the
// delay to zero on submit — read here in `@tanstack/form-core` 1.33.5,
// `dist/esm/utils.js` lines 180-215: `debounceMs` resolves from
// `options.asyncDebounceMs ?? 0`, is overridden per cause by
// `onChangeAsyncDebounceMs` / `onBlurAsyncDebounceMs` /
// `onDynamicAsyncDebounceMs`, and is set to 0 when the cause is `submit`.
// Only `getAsyncValidatorArray` computes it, so a synchronous rule is never
// delayed at all. Here there is one `validate(root)` for the WHOLE root, so a
// delay on the pass would delay the required-field message along with the
// network rule. That is not a smaller version of what TanStack ships; it is a
// different and worse thing, and there is no knob.
//
// What the runtime knows and an adapter cannot is the other half of the same
// fact: that a pass has been SUPERSEDED. The scheduler already drops an
// overtaken answer by pass number (schedule-validation.ts); the signal is that
// same fact told to the validator early enough to stop. So the delay stays
// where it belongs — inside the one async rule that wants it — and the
// cancellation comes from the only party in a position to know.
//
// It is a second ARGUMENT rather than a second MEMBER because an adapter that
// does not want it says nothing at all: a one-parameter `validate` is still
// assignable, and the runtime reads `validate.length` and never constructs a
// controller for it. Both shipped vendor resolvers are in that case — neither
// zod's nor luq's verdict call takes a signal, so neither forwards one.
// ===========================================================================
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";
import type { FormIssue } from "./form-issue.types.js";
import type { MaybeAsync } from "./maybe-async.types.js";
import type { ValidationSignal } from "./validation-signal.types.js";

/** What one validator's schema offers a form runtime. */
export interface FormAdapter<
  T,
  TPath extends string = string,
  TCode extends string = string,
> {
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
   *
   * `signal` is aborted when a NEWER pass starts, so an async rule can stop a
   * round trip whose answer is already going to be discarded. An adapter that
   * declares only `root` is never handed one and never causes an
   * `AbortController` to be constructed — the runtime gates on
   * `validate.length >= 2`. An adapter that DOES take it changes what a
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
