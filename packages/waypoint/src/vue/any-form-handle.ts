// ===========================================================================
// any-form-handle.ts — a handle of any shape, as a prop type, with no cast at
// the call site and no `any` in it.
//
// THE PROBLEM. `FormHandle<T, TPath>` is INVARIANT in `T`: `field` returns a
// type computed from it and takes one computed from it, so `FormHandle<Order,
// …>` is not assignable to `FormHandle<unknown, string>`. A `<FormProvider
// :form="form">` whose prop was declared at the erased type would therefore be
// satisfiable by no real form at all — every application would cast, at every
// provider. The React binding meets the same wall and puts its cast inside the
// component, which works because JSX infers the component's type parameters
// from the props it was given; a Vue render function does not, so a generic
// export erases to `unknown` at the `h()` call and lands back on the wall.
//
// THE MECHANISM. TypeScript compares two references to the SAME generic type
// by variance and stops there. It compares a reference against anything else
// structurally. So the type below — a mapped type over the erased handle, not
// a reference to it — is compared member by member, and every member of a real
// handle IS assignable to its erased counterpart, because each of them is
// either covariant or a method (and method parameters are bivariant).
//
// WHAT IT IS NOT. It is not a widening and it is not a lie: it has exactly the
// members `FormHandle<unknown, string>` has, with exactly their types, and it
// is assignable back to `FormHandle<unknown, string>` with no cast — which is
// how the provider hands it on. What it drops is the ability to compute a
// value type from a path, and the provider never had a use for one: it reads
// `key`, `coverage` and `onFieldMismatch`, and passes the rest through. The
// value types are read out of the registry by the composables, which is where
// they were always read.
//
// It stays in step by construction. `keyof` does the enumerating, so a member
// added to `FormHandle` is a member of this on the same build.
// ===========================================================================
import type { FormHandle } from "../core/index.js";

export type AnyFormHandle = {
  [K in keyof FormHandle<unknown, string>]: FormHandle<unknown, string>[K];
};
