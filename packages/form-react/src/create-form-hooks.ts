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
import { declaredPathOf, type FormHandle } from "form-core";
import type {
  FieldBinding,
  UncontrolledFieldBinding,
} from "./field-binding.types.js";
import { useField } from "./use-field.js";
import { useFieldValue } from "./use-field-value.js";
import { useFieldValues } from "./use-field-values.js";
import { useFieldIssues } from "./use-field-issues.js";
import { useUncontrolledField } from "./use-uncontrolled-field.js";
import { useForm } from "./use-form.js";
import { useFieldScope } from "./use-field-scope.js";
import { declaredPathIn } from "./resolve-scoped-path.js";

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

/**
 * WARNED, NOT THROWN. A field addressed at a path the form does not declare is
 * inert: it draws nothing and it validates nothing. It cannot, however, let
 * bad data through — the pass judges the whole ROOT, so the verdict and the
 * submit gate are both still correct, and what has actually broken is one
 * field's display.
 *
 * Throwing takes the entire form down for that. A warning names the mistake
 * loudly in the console, in development and production alike, and leaves the
 * other two hundred fields working. TypeScript callers never reach either:
 * the path is a compile error.
 *
 * Once per distinct path, because a form re-renders and a warning repeated on
 * every keystroke is a warning nobody reads.
 */
const alreadyWarned = new Set<string>();

const warnUndeclared = (wanted: string, known: ReadonlySet<string>): void => {
  if (alreadyWarned.has(wanted)) return;
  alreadyWarned.add(wanted);
  const asRule = declaredPathOf(wanted);
  if (asRule !== wanted && known.has(asRule)) {
    console.warn(
      `[form-contract] "${wanted}" names one row of "${asRule}", and this form ` +
        "has no such row right now. The field will draw nothing until it does."
    );
    return;
  }
  const near = [...known].filter(
    (one) =>
      one.startsWith(wanted.slice(0, 4)) || wanted.startsWith(one.slice(0, 4))
  );
  console.warn(
    `[form-contract] "${wanted}" is not a field this form declares, so it will ` +
      "draw nothing and validate nothing." +
      (near.length === 0 ? "" : ` Did you mean: ${near.slice(0, 4).join(", ")}?`)
  );
};

/** Test seam: the warning is once per path for the life of the module. */
export const forgetWarnings = (): void => alreadyWarned.clear();

/**
 * Declared paths per handle, computed once. Building the set per render would
 * be O(fields) inside every field, which is O(fields squared) for the form —
 * the exact shape of cost the rest of this runtime exists to avoid.
 */
const declaredBy = new WeakMap<object, ReadonlySet<string>>();

const declaredPathsOf = (form: FormHandle<unknown, string>): ReadonlySet<string> => {
  const cached = declaredBy.get(form);
  if (cached !== undefined) return cached;
  const built = new Set(form.descriptors.map((field) => field.path));
  declaredBy.set(form, built);
  return built;
};

export function createFormHooks<T, TPath extends string>(
  adapter: FormAdapter<T, TPath>
): FormHooks<T, TPath> {
  const fromAdapter = new Set<string>(adapter.fields.map((field) => field.path));

  // Checked against the ENCLOSING form, not only against the adapter this
  // closed over: rendering these hooks under a different form's provider is
  // the one mistake the types cannot see, and it is the same lookup that
  // catches a typo, so both cost one set probe.
  const useCheckedPath = (path: string): string => {
    const form = useForm();
    const scope = useFieldScope();
    const wanted = declaredPathIn(path, scope);
    // A concrete index is a place, not a rule, so it is checked as its rule.
    const asRule = declaredPathOf(wanted);
    const here = declaredPathsOf(form);
    if (!fromAdapter.has(asRule) || !here.has(asRule)) {
      warnUndeclared(wanted, here);
    }
    return path;
  };

  return {
    adapter,
    useField: <TValue,>(path: AddressablePath<TPath>): FieldBinding<TValue> =>
      useField<TValue>(useCheckedPath(path)),
    useUncontrolledField: <TValue,>(
      path: AddressablePath<TPath>
    ): UncontrolledFieldBinding<TValue> =>
      useUncontrolledField<TValue>(useCheckedPath(path)),
    useFieldValue: <TValue,>(path: AddressablePath<TPath>): TValue | undefined =>
      useFieldValue<TValue>(useCheckedPath(path)),
    useFieldValues: <TValue,>(path: AddressablePath<TPath>): readonly TValue[] =>
      useFieldValues<TValue>(useCheckedPath(path)),
    useFieldIssues: (path: AddressablePath<TPath>): readonly FormIssue[] =>
      useFieldIssues(useCheckedPath(path)),
  };
}
