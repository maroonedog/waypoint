// ===========================================================================
// form-context.ts — the handle, and nothing that changes.
//
// The context value is the handle itself, which is created once and never
// replaced. Every consumer of a React context re-renders when its value's
// identity changes, so a context carrying anything derived would re-render the
// whole subtree on every keystroke — the exact thing this runtime exists to
// avoid.
// ===========================================================================
import { createContext } from "react";
import type { FormHandle } from "../core/index.js";

export const FormContext = createContext<FormHandle<unknown, string> | null>(
  null
);
