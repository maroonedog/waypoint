// ===========================================================================
// use-create-form.ts — one runtime per component instance.
//
// WHY AN INITIALISER. The component body runs on every render, so calling
// `createForm` there builds a fresh cell space each time and discards the
// previous one with everything typed into it. Measured: type into such a
// form, let the parent re-render, and the input is back to its default while
// createForm has run twice. The initialiser runs once per instance.
//
// WHY A FACTORY RATHER THAN AN OPTIONS OBJECT. Two reasons, and the second is
// the one that matters.
//
// An argument expression is evaluated on every render even when only the first
// result is used, so `useCreateForm({ adapter: zodFormResolver(schema) })`
// would walk the schema every time. Measured on this repository's own shapes:
// 20 us at 31 leaves, 25 at 61, 55 at 201 — proportional to the form, and
// paid per keystroke on the screen that owns it.
//
// And an options object would LIE ABOUT LIFETIME. It reads like props, so a
// caller would reasonably expect a changed `defaultValues` to reach the form.
// It would not: the initialiser never reads its argument again, and the change
// would be silently ignored. A factory says "this is a recipe, run once",
// which is the same signal React's own `useState(() => expensive())` carries.
//
// What this does NOT defend against is a handle built at module scope — that
// is still possible and this shape does not prevent it. Sharing one handle
// shares its values, which is a lifetime mistake to make in the application
// rather than something an API can take away.
// ===========================================================================
import { useState } from "react";
import { createForm, type FormHandle, type FormOptions } from "../core/index.js";

export function useCreateForm<T, TPath extends string = string>(
  options: () => FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const [form] = useState(() => createForm(options()));
  return form;
}
