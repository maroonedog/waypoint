"use client";
// ===========================================================================
// index.ts — the `./react` entry, and the one file in this package that
// carries a module-level directive.
//
// WHY IT IS THERE. Next.js's advice to library authors is to put `use client`
// on the entry points that rely on client-only features, so a consumer can
// import them into a Server Component without writing a wrapper module.
// Without it a Next App Router user cannot import these bindings from a Server
// Component at all — every hook below reaches `useSyncExternalStore` — and a
// library that makes every consumer hand-write the same one-line shim has
// shipped a chore rather than a binding. It is also the first prerequisite for
// any future server-action story, which this package does not have.
//
// WHY ONLY THERE. The `exports` map has no wildcard, so `dist/react/index.js`
// is the only way into `./react`; and this file re-exports BY NAME rather than
// with `export *`, which is the spelling the directive is known to survive.
// Everything client-only in this entry is reached through this file, so one
// directive covers the entry and no other file needs one.
//
// IT SURVIVES THE BUILD, which is the part that is usually assumed. There is
// no bundler in the publish path — the build is `tsc -b` — and tsc 5.9.3 under
// this repository's options emits the directive as line 1 of
// `dist/react/index.js`, above the imports and absent from the `.d.ts`. Run
// `npm run build` and read the first line if you doubt it.
//
// WHAT IT COSTS, stated rather than discovered later. Five exports below call
// no hook — `buildInputProps`, `buildUncontrolledInputProps`, `inputTypeFor`,
// `fieldElementIds` and `resolveWidget` — and behind a client boundary those
// become client references rather than callable functions for a Server
// Component importing them. They are NOT moved to `./core` to dodge that:
// `inputTypeFor` returns DOM input type names and `./core`'s claim is that it
// names no DOM, so the move would trade a real boundary for a false one.
//
// The other cost is one warning for a non-Next consumer who bundles the built
// package, and nothing else. Measured here against the built
// `dist/react/index.js`, bundling an entry that imports only `useField`:
// rollup prints `Module level directives cause errors when bundled,
// "use client" in ... was ignored` and still produces the bundle; esbuild
// prints nothing; `AutoForm` and `FieldRows` are absent from both outputs, so
// tree-shaking is untouched; and neither output carries the directive.
// ===========================================================================
export { FormContext } from "./form-context.js";
export { DEFAULT_FORM_KEY, FormKeyContext } from "./form-key-context.js";
export type {
  AnyPath,
  AnyValues,
  ArrayPath,
  FormColumnPath,
  FormDeclaredPath,
  FormKey,
  FormKeyOfPath,
  FormListPath,
  FormLocalPath,
  FormPath,
  FormPathOver,
  FormPathTo,
  WaypointForms,
  InhabitedFormPath,
  PathsFor,
  ValueAtFormPath,
  ValueOfPath,
  ValuesAtFormPath,
  ValuesFor,
} from "./waypoint-forms.js";
export { FormProvider, type FormProviderProps } from "./form-provider.js";
export { useCreateForm } from "./use-create-form.js";
export { useForm, useFormHandle } from "./use-form.js";
export { useCell } from "./use-cell.js";
export { forgetUnaddressableWarnings } from "../core/index.js";
export type {
  FieldCoverage,
  FieldMismatchReaction,
  MissingField,
  MissingFieldReason,
} from "../core/index.js";
export { describeMissingFields } from "./describe-missing-fields.js";
export {
  DEFAULT_ISSUE_VISIBILITY,
  IssueVisibilityContext,
} from "./issue-visibility-context.js";
export { issuesAreVisible, type IssueVisibility } from "./issue-visibility.js";
export { decorateElement } from "./decorate-element.js";
export type { FieldOptions } from "./bind-field.js";
export type { FieldPart } from "./field-binding.types.js";
export { useField } from "./use-field.js";
export { useUncontrolledField } from "./use-uncontrolled-field.js";
export { useFieldValue } from "./use-field-value.js";
export { useFieldValues } from "./use-field-values.js";
export { useFieldIssues } from "./use-field-issues.js";
export { useFormStatus, type FormStatus } from "./use-form-status.js";
export {
  useErrorSummary,
  type ErrorSummary,
  type ErrorSummaryEntry,
  type ErrorSummaryRegionProps,
  type ErrorSummaryScopeProps,
} from "./use-error-summary.js";
export { fieldControlAt, focusFieldControl } from "./find-field-control.js";
export type { FieldIssueSummary } from "../core/index.js";
export { Field, type FieldProps } from "./field.js";
export type { FieldRow } from "./field-row.types.js";
export { useParticipation } from "./use-participation.js";
export { useRows, type RowsBinding } from "./use-rows.js";
export { FieldRows, type FieldRowsProps } from "./field-rows.js";
export { AutoForm, type AutoFormProps } from "./auto-form.js";
export {
  EMPTY_REGISTRY,
  WidgetRegistryContext,
} from "./widget-registry-context.js";
export { resolveWidget } from "./resolve-widget.js";
export type {
  FormWidget,
  WidgetProps,
  WidgetRegistry,
} from "./widget-registry.types.js";
export { buildInputProps } from "./build-input-props.js";
export { buildUncontrolledInputProps } from "./build-uncontrolled-input-props.js";
export { inputTypeFor } from "./input-attributes.js";
export { fieldElementIds, type FieldElementIds } from "./field-element-ids.js";
export type {
  FieldBinding,
  FieldChangeEvent,
  FieldDescriptionProps,
  FieldErrorProps,
  FieldInputProps,
  FieldLabelProps,
  UncontrolledChangeEvent,
  UncontrolledFieldBinding,
  UncontrolledInputProps,
} from "./field-binding.types.js";
