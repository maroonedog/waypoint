// ===========================================================================
// form-provider.tsx — puts one handle in reach of a subtree.
//
// The handle is passed straight through as the context value. Wrapping it in
// an object built here would give the context a new identity every render and
// re-render every consumer, which is precisely what a per-cell subscription
// exists to prevent.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { FormHandle } from "form-core";
import { FormContext } from "./form-context.js";

export interface FormProviderProps {
  readonly form: FormHandle<never, string>;
  readonly children: ReactNode;
}

export function FormProvider(props: FormProviderProps): ReactElement {
  return (
    <FormContext.Provider
      value={props.form as unknown as FormHandle<unknown, string>}
    >
      {props.children}
    </FormContext.Provider>
  );
}
