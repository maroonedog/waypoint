// ===========================================================================
// form-provider.ts — puts one handle, and the widgets to draw it with, in
// reach of a subtree.
//
// `provide()` CALLS IN ONE `setup()`, where the React provider has to wrap the
// subtree in a `Context.Provider` element per value. That is the one place Vue
// is structurally cheaper here, and it removes an argument rather than winning
// one: the React file reasons about whether a conditional fiber is worth
// rendering for a feature few applications use, and this one has no fiber to
// reason about, so every value is simply provided.
//
// The handle is provided as itself. Wrapping it in an object built here would
// give it a new identity on every render, which is precisely what a per-cell
// subscription exists to prevent.
//
// THE VISIBILITY AND THE WORDING ARE PROVIDED AS GETTERS. `setup()` runs once,
// so a plain `props.showIssues` read here is the value the subtree keeps for
// ever — and a screen that reveals its issues after a refused submit changes
// exactly that prop. What cannot move is provided as itself; injection-keys.ts
// says which is which, and why the registry is in the second group.
//
// `formKey` says which registered form this is. It matters only to an
// application that registered more than one: a call typed against a named form
// compares that name with this one and throws when they disagree, which is the
// single thing the registry cannot check for itself.
//
// And it is compared against the FORM'S OWN name before anything else reads
// it. `createForm({ key })` and this prop are two places to say one thing,
// both type-checked, and letting the prop win in silence is how a form that
// calls itself `admin`, rendered here as `customer`, answers every `customer:`
// path beneath it.
//
// THE `form` PROP IS NOT GENERIC AND IS NOT `FormHandle<unknown, string>`
// EITHER. A handle is invariant in its value type, so the erased spelling is
// inhabited by no real form, and a generic component's parameters are erased
// again at an `h()` call — so either of the obvious two would have put a cast
// in every application. `AnyFormHandle` is what it takes instead;
// any-form-handle.ts is the whole argument, and it is worth the file because
// the reason it works is a rule about how TypeScript compares two references
// to one generic type, which nothing in the shape of it says.
// ===========================================================================
import {
  defineComponent,
  provide,
  type ExtractPublicPropTypes,
  type PropType,
} from "vue";
import type { AnyCode, FormKey } from "../contract/index.js";
import type { AnyFormHandle } from "./any-form-handle.js";
import { DEFAULT_FORM_KEY } from "../dom/parse-qualified-path.js";
import {
  DEFAULT_ISSUE_VISIBILITY,
  type IssueVisibility,
} from "../dom/issue-visibility.js";
import type {
  AnyFormMessageFor,
  FormMessageFor,
} from "../dom/form-message.js";
import {
  FormInjection,
  FormKeyInjection,
  FormMessageInjection,
  IssueVisibilityInjection,
  WidgetRegistryInjection,
} from "./injection-keys.js";
import {
  EMPTY_REGISTRY,
  type WidgetRegistry,
} from "./widget-registry.types.js";
import { useCoverageReport } from "./use-coverage-report.js";

/**
 * Declared once, so that the props a caller writes and the props the component
 * reads cannot be two statements that drift. `FormProviderProps` is derived
 * from this rather than written beside it.
 */
const providerProps = {
  form: {
    type: Object as PropType<AnyFormHandle>,
    required: true,
  },
  /**
   * Which registered form this is. Omit it and the form's own `key` is used,
   * so an application that named the form where it was created does not name
   * it twice — and the two names cannot drift apart. Omit both and the default
   * key stands, which is what an application with one form wants.
   */
  formKey: { type: String as PropType<FormKey>, required: false },
  /**
   * This subtree draws PART of the form on purpose — a wizard step, a tab — so
   * it is not asked whether every declared field reached the page.
   *
   * It silences THAT question and no other. A path this form does not declare
   * is still reported from underneath.
   */
  partial: { type: Boolean, default: false },
  /**
   * When the fields below start showing what a pass found. Defaults to
   * `"immediately"`; `"touched"` waits for each field's first blur and
   * `"dirty"` for its first edit.
   *
   * IT GOVERNS DISPLAY AND NOTHING ELSE. Passes run exactly as they did, and
   * `errorCount`, `blockedBy` and the submit gate all still count a field that
   * is not saying anything yet. A refused submit reveals every field whatever
   * this says.
   */
  showIssues: { type: String as PropType<IssueVisibility>, required: false },
  /**
   * This application's wording for an issue, over the validator's, for every
   * composable beneath that hands out a message.
   *
   * Returning undefined keeps what the validator said, so a partial table is
   * safe: a missing translation must leave a real message standing rather than
   * blanking an error, because an empty live region announces nothing and
   * reads as a field with no problem.
   */
  messageFor: {
    type: Function as PropType<FormMessageFor<AnyCode>>,
    required: false,
  },
  /** Layer 2. Omit it and layer 3 still works; nothing else needs one. */
  widgets: { type: Object as PropType<WidgetRegistry>, required: false },
} as const;

export type FormProviderProps = ExtractPublicPropTypes<typeof providerProps>;

export const FormProvider = defineComponent({
  name: "FormProvider",
  props: providerProps,
  setup(props, { slots }) {
    if (
      props.formKey !== undefined &&
      props.form.key !== undefined &&
      props.formKey !== props.form.key
    ) {
      throw new Error(
        `This <FormProvider> was given formKey "${props.formKey}", but the ` +
          `form it carries names itself "${props.form.key}". Say it once: ` +
          "either drop the prop, or drop `key` from the createForm options."
      );
    }
    // Asked here because this is the component that knows where the subtree
    // ends, and answered after it has mounted — see use-coverage-report.ts.
    // The key is passed rather than read from the form, for the same reason
    // the paths below use it: it is the name under which this subtree's paths
    // were spelled, so it is the name a message should quote them with.
    useCoverageReport(
      props.form,
      props.formKey ?? props.form.key,
      props.partial
    );
    provide(FormInjection, props.form);
    provide(
      FormKeyInjection,
      props.formKey ?? props.form.key ?? DEFAULT_FORM_KEY
    );
    provide(WidgetRegistryInjection, props.widgets ?? EMPTY_REGISTRY);
    provide(
      IssueVisibilityInjection,
      () => props.showIssues ?? DEFAULT_ISSUE_VISIBILITY
    );
    provide(
      FormMessageInjection,
      () => props.messageFor as AnyFormMessageFor | undefined
    );
    return () => slots.default?.();
  },
});
