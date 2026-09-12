// ===========================================================================
// form-key-context.ts — which registered form the enclosing provider is.
//
// The key is the one thing the types cannot check. `useField("order", …)`
// names a form in the REGISTRY; the instance still comes from the nearest
// provider, and nothing in the type system relates the two. So the provider
// carries its key as an ordinary string and the hook compares them, which
// turns "typed against one form, rendered under another" from a silent wrong
// answer into a thrown one.
//
// A string, not an object, so the context value is stable by construction.
// ===========================================================================
import { createContext } from "react";

/** The key a provider carries when it does not name one. */
export const DEFAULT_FORM_KEY = "form";

export const FormKeyContext = createContext<string>(DEFAULT_FORM_KEY);
