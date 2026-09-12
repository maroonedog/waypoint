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
// itself cannot be generic. The value type is dropped on the way in — and
// picked up again from the type REGISTRY rather than from whoever reads it
// out, which is why no hook below asks a caller to assert it.
//
// `formKey` says which registered form this is. It matters only to an
// application that registered more than one: a hook typed against a named form
// compares that name with this one and throws when they disagree, which is the
// single thing the registry cannot check for itself.
//
// Its provider is rendered only when the key actually CHANGES. A provider is a
// fiber, and one rendered unconditionally showed up as two more changed fibers
// per keystroke in the benchmark — a cost on every application, for a feature
// used by the few that register more than one form. Comparing against the
// inherited key rather than against undefined is what keeps an unnamed form
// nested inside a named one from inheriting the outer name.
// ===========================================================================
import { useContext, type ReactElement, type ReactNode } from "react";
import type { FormHandle } from "form-core";
import { FormContext } from "./form-context.js";
import { DEFAULT_FORM_KEY, FormKeyContext } from "./form-key-context.js";
import {
  EMPTY_REGISTRY,
  WidgetRegistryContext,
} from "./widget-registry-context.js";
import type { WidgetRegistry } from "./widget-registry.types.js";

export interface FormProviderProps<T, TPath extends string> {
  readonly form: FormHandle<T, TPath>;
  /** Which registered form this is. Omit it when the application has one. */
  readonly formKey?: string;
  /** Layer 2. Omit it and layer 3 still works; nothing else needs one. */
  readonly widgets?: WidgetRegistry;
  readonly children: ReactNode;
}

export function FormProvider<T, TPath extends string>(
  props: FormProviderProps<T, TPath>
): ReactElement {
  const inherited = useContext(FormKeyContext);
  const formKey = props.formKey ?? DEFAULT_FORM_KEY;
  const widgets = (
    <WidgetRegistryContext.Provider value={props.widgets ?? EMPTY_REGISTRY}>
      {props.children}
    </WidgetRegistryContext.Provider>
  );
  return (
    <FormContext.Provider
      value={props.form as unknown as FormHandle<unknown, string>}
    >
      {formKey === inherited ? (
        widgets
      ) : (
        <FormKeyContext.Provider value={formKey}>
          {widgets}
        </FormKeyContext.Provider>
      )}
    </FormContext.Provider>
  );
}
