// ===========================================================================
// use-form.ts — the handle for the enclosing form.
//
// The value type no longer comes from the call site. It comes from the
// registry, which is the only place in an application that states it, so
// `useForm()` is checked rather than asserted.
//
// Naming a key checks that key against the provider's. Naming none accepts
// whatever provider is there.
//
// A KEY IS NOT A PATH, which is why this hook keeps its argument while the
// path hooks gave theirs up: there is no path in this call for a form's name
// to travel inside. What changed underneath is who reaches the comparison
// below. It used to be only a call that passed a key as a separate argument; a
// call that passed none handed this `undefined` and skipped it. The path hooks
// now take their key out of the path itself, and compare it in
// parse-qualified-path.ts, which is where the message they throw lives.
// ===========================================================================
import { useContext } from "react";
import type { FormHandle } from "../core/index.js";
import { FormContext } from "./form-context.js";
import { FormKeyContext } from "./form-key-context.js";
import type {
  AnyPath,
  AnyValues,
  FormKey,
  PathsFor,
  ValuesFor,
} from "./form-type-registry.js";

/**
 * The enclosing handle, untyped, with the key checked when one was named.
 * Every hook in this package goes through here.
 */
export function useFormHandle(expectedKey?: string): FormHandle<unknown, string> {
  const handle = useContext(FormContext);
  const key = useContext(FormKeyContext);
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
 * The implementation returns `never` so that BOTH overloads are satisfied by
 * it. `FormHandle<never, string>` was not: a handle is invariant in its value
 * type, so once an application registers a form, `AnyValues` stops being
 * `never` and the first overload no longer matches — which made this file fail
 * to compile in every compilation that had a registry, and only in those.
 */
export function useForm(key?: string): never {
  return useFormHandle(key) as never;
}
