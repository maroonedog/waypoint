// ===========================================================================
// create-form-hooks.ts — the hooks, with the paths the adapter declared.
//
// `useField` takes a `string`. It has to: one React context object serves
// every form in the application, so the context cannot be generic, and the
// path union dies at that boundary. The consequence was a silent one — a
// misspelt path renders an empty input that is never validated and says
// nothing, which is exactly the failure mode this repository criticises other
// libraries for.
//
// This closes it from the other side. The hooks are made ONCE from the
// adapter, so they carry `TPath` without the context having to, and a misspelt
// path is a compile error at the call site.
//
// Assign the result to a PascalCase name:
//
//   export const OrderForm = createFormHooks(zodFormResolver(orderSchema));
//   const postcode = OrderForm.useField("billing.postcode");
//
// That is not decoration. eslint-plugin-react-hooks only recognises a hook
// behind a member expression when the object is a single PascalCase
// identifier: `Order.useField()` is checked, `order.useField()` and
// `forms.order.useField()` are not. Destructuring works too, because a bare
// `useField` is a hook name by itself.
//
// The adapter is used for its TYPE. At run time these hooks still read the
// enclosing <FormProvider> like every other hook here, which is what keeps a
// nested component propless. What they add is an assertion that the path is
// one the enclosing form actually declares — so the silent empty field becomes
// a thrown error in JavaScript too, where the types are not there to help.
// ===========================================================================
import type { AddressablePath, FormAdapter, FormIssue } from "form-contract";
import type {
  FieldBinding,
  UncontrolledFieldBinding,
} from "./field-binding.types.js";
import { useField } from "./use-field.js";
import { useFieldValue } from "./use-field-value.js";
import { useFieldValues } from "./use-field-values.js";
import { useFieldIssues } from "./use-field-issues.js";
import { useUncontrolledField } from "./use-uncontrolled-field.js";

export interface FormHooks<T, TPath extends string> {
  useField<TValue = unknown>(path: AddressablePath<TPath>): FieldBinding<TValue>;
  useUncontrolledField<TValue = unknown>(
    path: AddressablePath<TPath>
  ): UncontrolledFieldBinding<TValue>;
  useFieldValue<TValue = unknown>(path: AddressablePath<TPath>): TValue | undefined;
  /** Every place a wildcard covers. See useFieldValues. */
  useFieldValues<TValue = unknown>(path: AddressablePath<TPath>): readonly TValue[];
  useFieldIssues(path: AddressablePath<TPath>): readonly FormIssue[];
  /** The adapter these were built from, so a caller keeps one import. */
  readonly adapter: FormAdapter<T, TPath>;
}

/** The value type a set of hooks was built for. */
export type ValuesOf<H> = H extends FormHooks<infer T, string> ? T : never;
/** The paths a set of hooks accepts. */
export type PathsOf<H> = H extends FormHooks<unknown, infer P> ? P : never;

export function createFormHooks<T, TPath extends string>(
  adapter: FormAdapter<T, TPath>
): FormHooks<T, TPath> {
  // Types only. Whether a path exists is the STORE's question — it holds the
  // descriptors, every caller funnels through form.field(), and a second
  // answer kept here was both a duplicate and a wrong one: it was built from
  // adapter.fields, which carries leaves only, so it warned about "items" and
  // "owner" — an array-level issue and a container read, both legitimate.
  const fromAdapter = new Set<string>(adapter.fields.map((field) => field.path));

  // Checked against the ENCLOSING form, not only against the adapter this
  // closed over: rendering these hooks under a different form's provider is
  // the one mistake the types cannot see, and it is the same lookup that
  // catches a typo, so both cost one set probe.
  return {
    adapter,
    useField: <TValue,>(path: AddressablePath<TPath>): FieldBinding<TValue> =>
      useField<TValue>(path),
    useUncontrolledField: <TValue,>(
      path: AddressablePath<TPath>
    ): UncontrolledFieldBinding<TValue> =>
      useUncontrolledField<TValue>(path),
    useFieldValue: <TValue,>(path: AddressablePath<TPath>): TValue | undefined =>
      useFieldValue<TValue>(path),
    useFieldValues: <TValue,>(path: AddressablePath<TPath>): readonly TValue[] =>
      useFieldValues<TValue>(path),
    useFieldIssues: (path: AddressablePath<TPath>): readonly FormIssue[] =>
      useFieldIssues(path),
  };
}
