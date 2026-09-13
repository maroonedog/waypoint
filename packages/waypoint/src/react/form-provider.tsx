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
// And it is compared against the FORM'S OWN name before anything else reads it.
// `createForm({ key })` and this prop are two places to say one thing, both
// type-checked, and the prop used to win in silence — so a form that called
// itself `admin`, rendered here as `customer`, answered every `customer:` path
// beneath it. Nothing was wrong with any individual call; the two declarations
// simply disagreed and the mismatch a qualified path exists to catch was
// arranged one level above the paths.
//
// Its provider is rendered only when the key actually CHANGES. A provider is a
// fiber, and one rendered unconditionally showed up as two more changed fibers
// per keystroke in the benchmark — a cost on every application, for a feature
// used by the few that register more than one form. Comparing against the
// inherited key rather than against undefined is what keeps an unnamed form
// nested inside a named one from inheriting the outer name.
// ===========================================================================
import { useContext, type ReactElement, type ReactNode } from "react";
import type { FormHandle } from "../core/index.js";
import { FormContext } from "./form-context.js";
import { DEFAULT_FORM_KEY, FormKeyContext } from "./form-key-context.js";
import {
  EMPTY_REGISTRY,
  WidgetRegistryContext,
} from "./widget-registry-context.js";
import type { WidgetRegistry } from "./widget-registry.types.js";
import type { FormKey } from "./waypoint-forms.js";

export interface FormProviderProps<T, TPath extends string> {
  readonly form: FormHandle<T, TPath>;
  /**
   * Which registered form this is. Omit it and the form's own `key` is used,
   * so an application that named the form where it was created does not name
   * it twice — and the two names cannot drift apart. Omit both and the
   * default key stands, which is what an application with one form wants.
   *
   * A registered key rather than a string, so a misspelling does not compile
   * and never reaches a subtree to break. What the type cannot check is the
   * one below: whether this name and the form's own agree.
   */
  readonly formKey?: FormKey;
  /** Layer 2. Omit it and layer 3 still works; nothing else needs one. */
  readonly widgets?: WidgetRegistry;
  readonly children: ReactNode;
}

export function FormProvider<T, TPath extends string>(
  props: FormProviderProps<T, TPath>
): ReactElement {
  const inherited = useContext(FormKeyContext);
  if (
    props.formKey !== undefined &&
    props.form.key !== undefined &&
    props.formKey !== props.form.key
  ) {
    throw new Error(
      `This <FormProvider> was given formKey "${props.formKey}", but the form ` +
        `it carries names itself "${props.form.key}". Say it once: either drop ` +
        "the prop, or drop `key` from the createForm options."
    );
  }
  const formKey = props.formKey ?? props.form.key ?? DEFAULT_FORM_KEY;
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
