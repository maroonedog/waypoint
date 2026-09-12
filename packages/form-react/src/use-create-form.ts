// ===========================================================================
// use-create-form.ts — one runtime per component instance.
//
// Two separate reasons, and they are worth keeping apart.
//
// INSIDE AN INITIALISER, not in the component body. The body runs on every
// render, so `createForm` there builds a fresh cell space each time and the
// previous one — with everything typed into it — is discarded. Measured: type
// into such a form, let the parent re-render, and the input is back to its
// default. The initialiser runs once per instance instead. The factory is not
// a dependency and is deliberately not re-read, so an inline arrow at the call
// site does not rebuild the form every render.
//
// PER INSTANCE, not at module scope. A handle IS the cell space, so sharing
// one shares the values: two mounts of the same form show each other's typing,
// and leaving a screen and coming back shows what was there before. Both
// measured.
//
// On a server the same sharing is per PROCESS rather than per request — but
// rendering alone does not leak, because useSyncExternalStore only reads on
// the server and a renderToString leaves the root byte-identical (also
// measured). The leak needs a per-request WRITE: a loader calling reset with
// that user's defaults, a server action, anything that puts request data into
// a module-scope space.
// ===========================================================================
import { useState } from "react";
import { createForm, type FormHandle, type FormOptions } from "form-core";

export function useCreateForm<T, TPath extends string = string>(
  options: () => FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const [form] = useState(() => createForm(options()));
  return form;
}
