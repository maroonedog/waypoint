// ===========================================================================
// use-form-for-path.ts — the form a qualified path names, and the path inside
// it.
//
// The hooks that take a path and hand back a binding begin here, so the colon
// is read once and `./core` is handed a bare path. What each does with the two
// halves differs; which half is which does not, and none decides it for itself.
// `useParticipation` reads the colon with the same function and does not come
// through here, because it takes a form handle rather than finding one.
//
// The key comparison happens on the way through. A path that names another
// form throws rather than drawing nothing, which is the guard the keyless call
// could never reach: it had no key to compare, so the mistake it made was the
// one that printed a warning and rendered an empty input.
// ===========================================================================
import { useContext } from "react";
import type { FormHandle } from "../core/index.js";
import { FormKeyContext } from "./form-key-context.js";
import { formPathWithin } from "../dom/parse-qualified-path.js";
import { useFormHandle } from "./use-form.js";

export interface FormAndPath {
  readonly form: FormHandle<unknown, string>;
  /** Unqualified: what `./core` addresses a value with. */
  readonly path: string;
  /** Qualified: what the caller wrote, and what a diagnostic quotes back. */
  readonly spelling: string;
}

export function useFormForPath(spelling: string): FormAndPath {
  const key = useContext(FormKeyContext);
  const form = useFormHandle();
  return { form, path: formPathWithin(spelling, key), spelling };
}
