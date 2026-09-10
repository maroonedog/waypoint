// ===========================================================================
// use-create-form.ts — one runtime per component instance.
//
// Created inside a useState initialiser rather than at module scope. On a
// server a module-scope runtime is one mutable cell space shared by every
// concurrent request, so one user's typing would be another user's form.
//
// The initialiser runs once per instance; the factory is not a dependency and
// is deliberately not re-read, so an inline arrow at the call site does not
// rebuild the form every render.
// ===========================================================================
import { useState } from "react";
import { createForm, type FormHandle, type FormOptions } from "form-core";

export function useCreateForm<T, TPath extends string = string>(
  options: () => FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const [form] = useState(() => createForm(options()));
  return form;
}
