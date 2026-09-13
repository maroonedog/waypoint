// ===========================================================================
// use-form-for-path.ts — the form a qualified path names, and the path inside
// it, both of which are allowed to move.
//
// The colon is read here so that `./core` is handed a bare path, exactly as in
// the React binding, and the key comparison happens on the way through: a path
// naming another form throws rather than drawing nothing.
//
// WHAT IS DIFFERENT IS THAT THE SPELLING IS A GETTER. React's hooks re-run on
// every render, so a changed `path` prop is picked up for free. Vue's
// `setup()` runs once, so a composable that read its argument eagerly would
// keep the FIRST path's subscriptions for ever while the markup showed the new
// one — the input's `name` attribute would update, its value would not, and
// nothing would warn. Taking `MaybeRefOrGetter` and resolving through
// `toValue` inside a `computed` is what makes `<Field :path="chosen">` mean
// what it looks like it means.
// ===========================================================================
import { computed, inject, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import type { FormHandle } from "../core/index.js";
import {
  DEFAULT_FORM_KEY,
  formPathWithin,
} from "../dom/parse-qualified-path.js";
import { FormKeyInjection } from "./injection-keys.js";
import { useFormHandle } from "./use-form.js";

export interface FormAndPath {
  /** The handle itself, which a provider creates once and never replaces. */
  readonly form: FormHandle<unknown, string>;
  /** Unqualified: what `./core` addresses a value with. */
  readonly path: ComputedRef<string>;
  /** Qualified: what the caller wrote, and what a diagnostic quotes back. */
  readonly spelling: ComputedRef<string>;
}

export function useFormForPath(
  spelling: MaybeRefOrGetter<string>
): FormAndPath {
  const key = inject(FormKeyInjection, DEFAULT_FORM_KEY);
  const form = useFormHandle();
  return {
    form,
    path: computed(() => formPathWithin(toValue(spelling), key)),
    spelling: computed(() => toValue(spelling)),
  };
}
