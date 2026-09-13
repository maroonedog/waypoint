// ===========================================================================
// bind-field.ts — four subscriptions, composed into one binding.
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
// It is a PLACE, not a rule. One field is one value, so `items[*].sku` has no
// answer here — it names every sku in the list, and that question is
// `useFieldValues`. The rule is still what the VALUE type is computed from,
// because a descriptor and a declared type are both keyed by the rule.
//
// `useId` is the fifth hook and the only one that is not a subscription. It
// scopes this binding's element ids, for the reason field-element-ids.ts
// gives: a path is unique within one form and a field is deliberately bindable
// twice.
//
// IT REPORTS NOTHING ABOUT COVERAGE, and that is why it is a file of its own
// rather than the inside of the public hook. Whether this binding counts as
// somebody having taken responsibility for the place is a question its CALLER
// can answer and this cannot: a hook hands the binding to a component that
// will draw it, and a widget lookup may hand back nothing at all. Both callers
// want the same four subscriptions and a different answer to that question, so
// the subscriptions live here and the answer lives with each of them.
// ===========================================================================
import { useCallback, useId } from "react";
import type { FormHandle } from "../core/index.js";
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

export interface BoundField {
  readonly binding: FieldBinding<never>;
  /** The form the path named, for a caller that has something to tell it. */
  readonly form: FormHandle<unknown, string>;
  /** Unqualified, and already checked: the place the binding reached. */
  readonly path: string;
}

export function useFieldBinding(spelling: string): BoundField {
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
    form,
    path: handle.path,
    binding: {
      path: handle.path,
      descriptor: handle.descriptor,
      value: value as never,
      issues,
      isTouched,
      isDirty,
      isParticipating,
      setValue: (next) => handle.setValue(next),
      markTouched: () => handle.markTouched(),
      setParticipating: (participating) =>
        handle.setParticipating(participating),
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
    },
  };
}
