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
import type { FormAdapter, FormIssue } from "form-contract";
import { declaredPathOf, type FormHandle } from "form-core";
import type {
  FieldBinding,
  UncontrolledFieldBinding,
} from "./field-binding.types.js";
import { useField } from "./use-field.js";
import { useFieldValue } from "./use-field-value.js";
import { useFieldIssues } from "./use-field-issues.js";
import { useUncontrolledField } from "./use-uncontrolled-field.js";
import { useForm } from "./use-form.js";
import { useFieldScope } from "./use-field-scope.js";
import { declaredPathIn } from "./resolve-scoped-path.js";

export interface FormHooks<T, TPath extends string> {
  useField<TValue = unknown>(path: TPath): FieldBinding<TValue>;
  useUncontrolledField<TValue = unknown>(
    path: TPath
  ): UncontrolledFieldBinding<TValue>;
  useFieldValue<TValue = unknown>(path: TPath): TValue | undefined;
  useFieldIssues(path: TPath): readonly FormIssue[];
  /** The adapter these were built from, so a caller keeps one import. */
  readonly adapter: FormAdapter<T, TPath>;
}

/** The value type a set of hooks was built for. */
export type ValuesOf<H> = H extends FormHooks<infer T, string> ? T : never;
/** The paths a set of hooks accepts. */
export type PathsOf<H> = H extends FormHooks<unknown, infer P> ? P : never;

export class UndeclaredPathError extends Error {
  constructor(wanted: string, known: ReadonlySet<string>) {
    super(UndeclaredPathError.explain(wanted, known));
    this.name = "UndeclaredPathError";
  }

  /**
   * A concrete index is the interesting case rather than a typo. Descriptors
   * are keyed by the rule — `items[*].sku` — so `items[0].sku` is a real place
   * in the value that simply is not a declared path, and saying only "not
   * declared" would send somebody looking for a spelling mistake that is not
   * there.
   */
  private static explain(wanted: string, known: ReadonlySet<string>): string {
    const asRule = declaredPathOf(wanted);
    if (asRule !== wanted && known.has(asRule)) {
      return (
        `"${wanted}" names one row of "${asRule}", and a declared path never ` +
        "carries an index. Address it as " +
        `"${asRule}" inside a <FieldScope row={row}>, which is what binds the ` +
        "index — or use the untyped useField if the index really is fixed."
      );
    }
    const near = [...known].filter(
      (one) =>
        one.startsWith(wanted.slice(0, 4)) || wanted.startsWith(one.slice(0, 4))
    );
    return (
      `"${wanted}" is not a field this form declares.` +
      (near.length === 0 ? "" : ` Did you mean: ${near.slice(0, 4).join(", ")}?`)
    );
  }
}

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
    if (!fromAdapter.has(wanted)) {
      throw new UndeclaredPathError(wanted, fromAdapter);
    }
    const here = declaredPathsOf(form);
    if (!here.has(wanted)) throw new UndeclaredPathError(wanted, here);
    return path;
  };

  return {
    adapter,
    useField: <TValue,>(path: TPath): FieldBinding<TValue> =>
      useField<TValue>(useCheckedPath(path)),
    useUncontrolledField: <TValue,>(
      path: TPath
    ): UncontrolledFieldBinding<TValue> =>
      useUncontrolledField<TValue>(useCheckedPath(path)),
    useFieldValue: <TValue,>(path: TPath): TValue | undefined =>
      useFieldValue<TValue>(useCheckedPath(path)),
    useFieldIssues: (path: TPath): readonly FormIssue[] =>
      useFieldIssues(useCheckedPath(path)),
  };
}
