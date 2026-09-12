// ===========================================================================
// use-field.ts — four subscriptions, composed into one binding.
//
// Four separate reads rather than one bundled snapshot. A bundled reader would
// have to build an object per call, and a getSnapshot that returns a fresh
// object is what React reports as "The result of getSnapshot should be cached"
// before it loops. Composing in the component body is harmless: it happens
// after the snapshot comparison, not during it.
//
// Calling this opens subscriptions and nothing else. It does not register the
// field, seed a default or reset anything, so a field rendered in a portal, in
// a lazily loaded chunk, or behind a condition is not a case.
//
// The path is checked against the registry and the value type comes from it.
// Neither is asserted by the caller any more: `useField<string>(path)` used to
// mean "trust me", and what it usually meant was a misspelt path rendering an
// empty input that was never validated and said nothing.
//
// ONE ARGUMENT, because the path says which form it belongs to:
// `useField("admin:quotas.seats")`. There is no second spelling that takes the
// form beside the path — one call shape, so the value type is read out of the
// form the path itself names rather than out of every registered form at once.
// An application with a single registered form writes no prefix.
//
// It is a PLACE, not a rule. One field is one value, so `items[*].sku` has no
// answer here — it names every sku in the list, and that question is
// `useFieldValues`. The type used to accept it anyway and the runtime threw on
// the first render, which made the checked spelling the broken one. The rule
// is still what the VALUE type is computed from, because a descriptor and a
// declared type are both keyed by the rule.
//
// `useId` is the fifth hook and the only one that is not a subscription. It
// scopes this binding's element ids, for the reason field-element-ids.ts
// gives: a path is unique within one form and this hook is deliberately
// callable twice on the same path.
// ===========================================================================
import { useCallback, useId } from "react";
import type { FieldBinding } from "./field-binding.types.js";
import { buildInputProps } from "./build-input-props.js";
import {
  descriptionPropsFor,
  errorPropsFor,
  fieldElementIds,
  labelPropsFor,
} from "./field-element-ids.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "./form-type-registry.js";

export function useField<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>
): FieldBinding<ValueAtFormPath<Q>>;
export function useField(spelling: string): FieldBinding<never> {
  const { form, path } = useFormForPath(spelling);
  const handle = form.field(path);

  const value = useCell(handle.sources.value);
  const issues = useCell(handle.sources.issues);
  const isTouched = useCell(handle.sources.touched);
  const isDirty = useCell(handle.sources.dirty);
  const isParticipating = useCell(handle.sources.participating);

  const writeValue = useCallback(
    (next: unknown) => handle.setValue(next as never),
    [handle]
  );
  const onBlur = useCallback(() => handle.markTouched(), [handle]);

  const scope = useId();
  const ids = fieldElementIds(scope, handle.path);

  return {
    path: handle.path,
    descriptor: handle.descriptor,
    value: value as never,
    issues,
    isTouched,
    isDirty,
    isParticipating,
    setValue: (next) => handle.setValue(next),
    markTouched: () => handle.markTouched(),
    setParticipating: (participating) => handle.setParticipating(participating),
    validate: () => handle.validate(),
    issuesFor: (candidate) => handle.issuesFor(candidate),
    inputProps: buildInputProps({
      path: handle.path,
      descriptor: handle.descriptor,
      value,
      issues,
      ids,
      writeValue,
      onBlur,
    }),
    labelProps: labelPropsFor(ids),
    descriptionProps: descriptionPropsFor(ids, handle.descriptor?.description),
    errorProps: errorPropsFor(ids),
  };
}
