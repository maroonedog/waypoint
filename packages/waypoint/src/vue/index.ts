// ===========================================================================
// index.ts — the `./vue` entry.
//
// THE SECOND BINDING, AND WHAT IT IS FOR. `../dom` claimed to be the half of a
// binding that no framework owns. A claim like that is worth exactly what a
// second consumer says it is worth, and this is the second consumer: every
// attribute rule, every id, every visibility gate, the message table, the
// widget order and the path grammar below come from `../dom` and `../core`
// unchanged. What this entry adds is what Vue's reactivity actually needs —
// the `CellSource` bridge, `provide`/`inject` in place of five contexts, a
// scoped slot in place of a children function, and one prop key.
//
// THE REGISTRY IS THE ROOT'S, NOT THIS ENTRY'S, and that is the whole reason
// the registry was moved out of `./react` before this existed. A module
// augmentation names a MODULE; an application writes
//
//   declare module "@maroonedog/waypoint" { interface WaypointForms { … } }
//
// once, and a Vue file and a React file in the same repository are checked
// against the same paths, the same value types and the same issue codes. The
// path types are re-exported below so a Vue file does not have to know where
// they live, exactly as `./react` re-exports them.
//
// NO `use client` DIRECTIVE, and that is a difference rather than an
// oversight. The directive on `./react` exists so a Next.js Server Component
// can import the bindings without a hand-written shim. Vue's server rendering
// has no such boundary to declare, so there is nothing here for the directive
// to say.
//
// WHAT THIS ENTRY DOES NOT HAVE, said here rather than found by a reader
// grepping for a name: `useUncontrolledField` and its prop bag,
// `useErrorSummary`, `useFieldValue`, `useFieldValues`, `useFieldIssues`,
// `useParticipation` and `<AutoForm>`. Every fact each of them reads is
// reachable through `useForm()`, which hands back the same `FormHandle` the
// React binding is built on, and through `useCell`, which is exported below;
// none of them is blocked by anything Vue does. They are absent because a
// first binding that proves the seam is worth more than a second one that
// copies every name — and the uncontrolled one in particular is a different
// question in Vue, where the node is reached by `useTemplateRef` rather than
// by a `RefObject`, so it deserves a decision and not a translation.
// ===========================================================================

// RE-EXPORTED, NOT DECLARED. See the paragraph above: `declare module` goes on
// `@maroonedog/waypoint`, and these are the names it puts there.
export type {
  AnyCode,
  AnyPath,
  AnyValues,
  ArrayPath,
  CodesAtFormPath,
  CodesFor,
  FormColumnPath,
  FormDeclaredPath,
  FormKey,
  FormKeyOfPath,
  FormListPath,
  FormLocalPath,
  FormPath,
  FormPathOver,
  FormPathTo,
  InhabitedFormPath,
  PathsFor,
  ValueAtFormPath,
  ValueOfPath,
  ValuesAtFormPath,
  ValuesFor,
  WaypointForms,
} from "../contract/index.js";

export { forgetUnaddressableWarnings } from "../core/index.js";
export type {
  FieldCoverage,
  FieldIssueSummary,
  FieldMismatchReaction,
  MissingField,
  MissingFieldReason,
} from "../core/index.js";

export { FormProvider, type FormProviderProps } from "./form-provider.js";
export type { AnyFormHandle } from "./any-form-handle.js";
export {
  FormInjection,
  FormKeyInjection,
  FormMessageInjection,
  IssueVisibilityInjection,
  WidgetRegistryInjection,
} from "./injection-keys.js";
export { DEFAULT_FORM_KEY } from "../dom/parse-qualified-path.js";

export { useCreateForm } from "./use-create-form.js";
export { useForm, useFormHandle } from "./use-form.js";
export { useCell } from "./use-cell.js";
export { useField } from "./use-field.js";
export type { FieldOptions } from "./bind-field.js";
export { useFormStatus, type FormStatus } from "./use-form-status.js";
export { useRows, type RowsBinding } from "./use-rows.js";

export { Field, type FieldProps } from "./field.js";
export { FieldRows, type FieldRowsProps } from "./field-rows.js";
export { decorateVNode } from "./decorate-vnode.js";

export {
  EMPTY_REGISTRY,
  type FormWidget,
  type WidgetProps,
  type WidgetRegistry,
} from "./widget-registry.types.js";
export { resolveWidget } from "../dom/resolve-widget.js";

export type { FieldBinding, FieldInputProps } from "./field-binding.types.js";
export type {
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
  FieldPart,
} from "../dom/field-binding.types.js";
export { changeEventLike } from "./vue-input-props.js";

// The shared half, re-exported under the spellings `./react` uses, so a
// repository with both bindings has one vocabulary rather than two.
export { describeMissingFields } from "../dom/describe-missing-fields.js";
export {
  DEFAULT_ISSUE_VISIBILITY,
  issuesAreVisible,
  type IssueVisibility,
} from "../dom/issue-visibility.js";
export {
  wordedIssues,
  type AnyFormMessageFor,
  type FormMessageFor,
} from "../dom/form-message.js";
export { fieldControlAt, focusFieldControl } from "../dom/find-field-control.js";
export type { FieldRow } from "../dom/field-row.types.js";
export { buildInputProps } from "../dom/build-input-props.js";
export { inputTypeFor } from "../dom/input-attributes.js";
export {
  fieldElementIds,
  type FieldElementIds,
} from "../dom/field-element-ids.js";
