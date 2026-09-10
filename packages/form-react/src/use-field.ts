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
// ===========================================================================
import { useCallback } from "react";
import type { FieldBinding } from "./field-binding.types.js";
import { buildInputProps } from "./build-input-props.js";
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";
import { useFieldScope } from "./use-field-scope.js";
import { resolveScopedPath } from "./resolve-scoped-path.js";

export function useField<TValue>(localPath: string): FieldBinding<TValue> {
  const form = useForm();
  const scope = useFieldScope();
  const handle = form.field(resolveScopedPath(localPath, scope));

  const value = useCell(handle.sources.value) as TValue | undefined;
  const issues = useCell(handle.sources.issues);
  const isTouched = useCell(handle.sources.touched);
  const isDirty = useCell(handle.sources.dirty);

  const onChangeValue = useCallback(
    (next: string) => handle.setValue(next as unknown as TValue),
    [handle]
  );
  const onBlur = useCallback(() => handle.markTouched(), [handle]);

  return {
    path: handle.path,
    descriptor: handle.descriptor,
    value,
    issues,
    isTouched,
    isDirty,
    setValue: (next) => handle.setValue(next),
    markTouched: () => handle.markTouched(),
    validate: () => handle.validate(),
    check: (candidate) => handle.check(candidate),
    inputProps: buildInputProps({
      path: handle.path,
      descriptor: handle.descriptor,
      value,
      onChangeValue,
      onBlur,
    }),
  };
}
