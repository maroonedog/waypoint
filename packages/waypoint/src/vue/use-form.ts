// ===========================================================================
// use-form.ts — the handle for the enclosing form.
//
// The value type comes from the registry in the ROOT entry, which is the only
// place an application states it, so `useForm()` is checked rather than
// asserted — and it is the SAME registry a React application augments. A Vue
// file and a React file in one repository read one `declare module
// "@maroonedog/waypoint"`.
//
// Naming a key checks that key against the provider's. Naming none accepts
// whatever provider is there.
//
// A KEY IS NOT A PATH, which is why this composable keeps its argument while
// the path-taking ones read theirs out of the path: there is no path in this
// call for a form's name to travel inside.
// ===========================================================================
import { inject } from "vue";
import type { FormHandle } from "../core/index.js";
import { DEFAULT_FORM_KEY } from "../dom/parse-qualified-path.js";
import { FormInjection, FormKeyInjection } from "./injection-keys.js";
import type {
  AnyPath,
  AnyValues,
  FormKey,
  PathsFor,
  ValuesFor,
} from "../contract/index.js";

/**
 * The enclosing handle, untyped, with the key checked when one was named.
 * Every composable in this entry goes through here.
 */
export function useFormHandle(expectedKey?: string): FormHandle<unknown, string> {
  const handle = inject(FormInjection, null);
  const key = inject(FormKeyInjection, DEFAULT_FORM_KEY);
  if (handle === null) {
    throw new Error("useForm was called outside a <FormProvider>.");
  }
  if (expectedKey !== undefined && expectedKey !== key) {
    throw new Error(
      `This call is typed against the "${expectedKey}" form, but the ` +
        `enclosing <FormProvider> carries "${key}".`
    );
  }
  return handle;
}

export function useForm(): FormHandle<AnyValues, AnyPath>;
export function useForm<TKey extends FormKey>(
  key: TKey
): FormHandle<ValuesFor<TKey>, PathsFor<TKey>>;
/**
 * `never` so that BOTH overloads are satisfied by the implementation, for the
 * reason React's file gives: a handle is invariant in its value type, so
 * `FormHandle<never, string>` stops matching the first overload the moment an
 * application registers a form.
 */
export function useForm(key?: string): never {
  return useFormHandle(key) as never;
}
