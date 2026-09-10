// ===========================================================================
// form-provider.tsx — puts one handle, and the widgets to draw it with, in
// reach of a subtree.
//
// The handle is passed straight through as the context value. Wrapping it in
// an object built here would give the context a new identity every render and
// re-render every consumer, which is precisely what a per-cell subscription
// exists to prevent.
//
// The props are generic over the handle. A handle is invariant in its value
// type, because `field` returns a type computed from it, so a prop declared at
// one concrete type is inhabited by no other handle at all — a caller with a
// real form could only satisfy it with a cast.
//
// One context object serves every form in the application, so the context
// itself cannot be generic. The value type is dropped on the way in and stated
// again by whoever reads it out.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { FormHandle } from "form-core";
import { FormContext } from "./form-context.js";
import {
  EMPTY_REGISTRY,
  WidgetRegistryContext,
} from "./widget-registry-context.js";
import type { WidgetRegistry } from "./widget-registry.types.js";

export interface FormProviderProps<T, TPath extends string> {
  readonly form: FormHandle<T, TPath>;
  /** Layer 2. Omit it and layer 3 still works; nothing else needs one. */
  readonly widgets?: WidgetRegistry;
  readonly children: ReactNode;
}

export function FormProvider<T, TPath extends string>(
  props: FormProviderProps<T, TPath>
): ReactElement {
  return (
    <FormContext.Provider
      value={props.form as unknown as FormHandle<unknown, string>}
    >
      <WidgetRegistryContext.Provider value={props.widgets ?? EMPTY_REGISTRY}>
        {props.children}
      </WidgetRegistryContext.Provider>
    </FormContext.Provider>
  );
}
