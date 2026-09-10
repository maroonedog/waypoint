// ===========================================================================
// use-form.ts — the handle for the enclosing form.
//
// The value type is stated by the caller. A context cannot carry it: one
// context object is shared by every form in the app, so the type has to come
// from the call site or not at all. `form.field()` is where a path is checked
// against it.
// ===========================================================================
import { useContext } from "react";
import type { FormHandle } from "form-core";
import { FormContext } from "./form-context.js";

export function useForm<T = unknown, TPath extends string = string>():
  FormHandle<T, TPath> {
  const handle = useContext(FormContext);
  if (handle === null) {
    throw new Error("useForm was called outside a <FormProvider>.");
  }
  return handle as unknown as FormHandle<T, TPath>;
}
