// ===========================================================================
// form-message-context.ts — where the application's wording is declared.
//
// A context for the same reason the visibility default is one: the validator
// belongs to `./core` and the sentence belongs to the screen, so putting it in
// `FormOptions` would make the core entry decide how a form reads. It also
// composes the way a translation actually composes — one at the root of the
// application, and a subtree free to say something different without the form
// knowing.
//
// Undefined by default, and that is not merely "off": it is the branch that
// costs nothing. Every hook that hands out a message checks for undefined
// first and returns the validator's list unmapped, so an application that
// declares no wording allocates nothing and keeps the interned empty list.
// ===========================================================================
import { createContext } from "react";
import type { FormMessageFor } from "./form-message.js";

export const FormMessageContext = createContext<FormMessageFor | undefined>(
  undefined
);
