// ===========================================================================
// use-create-form.ts — one runtime per component instance.
//
// A FACTORY, AND FOR ONLY ONE OF REACT'S TWO REASONS. React's body re-runs on
// every render, so `useCreateForm({ adapter: zodFormResolver(schema) })` would
// walk the schema per keystroke and an options object would lie about
// lifetime. Vue's `setup()` runs once, so neither of those is true here: an
// options object would be read once and would be honest about it.
//
// The reason that survives is the other one. Two bindings that spell the same
// call differently make every example, every migration and every answer to
// "how do I do this in the other one" carry an exception, and the cost of the
// arrow is one arrow. What it also keeps is the freedom to move: if a Vue call
// site ever re-runs — a composable invoked again inside a re-created scope —
// the factory shape is still correct and the object shape is not.
//
// It is NOT wrapped in anything that remembers. `setup()` running once is the
// whole mechanism, and adding a cache over it would be guarding against a
// thing Vue does not do.
// ===========================================================================
import { createForm, type FormHandle, type FormOptions } from "../core/index.js";

export function useCreateForm<T, TPath extends string = string>(
  options: () => FormOptions<T, TPath>
): FormHandle<T, TPath> {
  return createForm(options());
}
