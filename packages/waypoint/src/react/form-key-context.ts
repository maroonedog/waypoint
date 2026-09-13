// ===========================================================================
// form-key-context.ts — which registered form the enclosing provider is.
//
// The key is the one thing the types cannot check. `useField("order:billing")`
// names a form in the REGISTRY; the instance still comes from the nearest
// provider, and nothing in the type system relates the two. So the provider
// carries its key as an ordinary string and every path-taking hook compares
// its prefix against it, which turns "typed against one form, rendered under
// another" from a silent wrong answer into a thrown one.
//
// A QUALIFIED path reaches that comparison. The guard existed before and was
// asked only of a call that passed a key as a separate argument; a call that
// passed none handed it `undefined` and skipped it, so the spelling with
// nothing in front of it was the spelling nothing checked. That spelling is
// now legal only where one form is registered, which is where there is
// nothing to tell apart — but it still reaches no comparison, and a bare path
// under a provider key that disagrees does nothing at all.
//
// The default is what an application with one form gets without writing
// anything down, so an unprefixed path and a `form:`-prefixed one reach the
// same place there.
//
// A string, not an object, so the context value is stable by construction.
// ===========================================================================
import { createContext } from "react";

/** The key a provider carries when it does not name one. */
export const DEFAULT_FORM_KEY = "form";

export const FormKeyContext = createContext<string>(DEFAULT_FORM_KEY);
