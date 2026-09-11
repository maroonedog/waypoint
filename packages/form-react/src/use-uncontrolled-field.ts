// ===========================================================================
// use-uncontrolled-field.ts — a field that does not wake React to type into.
//
// `useField` subscribes to the value cell, so a keystroke re-renders the
// component. Measured at 201 fields, that costs a commit React spends on the
// WHOLE sibling list: one keystroke that moves no verdict reported 212 changed
// fibers, of which 201 are React cloning the children of the form it had to
// descend through. The subscription is the only reason the commit happens at
// all — the field it woke needed nothing else.
//
// So this hook subscribes to the value cell IMPERATIVELY. The listener writes
// the DOM node instead of re-rendering, the input is uncontrolled, and a
// keystroke reaches React not at all. "Mounting is a subscription and nothing
// else" still holds; it is the same subscription, with a different effect.
//
// What it costs, stated rather than hidden: an uncontrolled input cannot be
// transformed as it is typed. Masking, upper-casing, inserting separators —
// anything that rewrites the value on its way to the DOM — needs the value to
// come back through React, which is what `useField` is for. That is why this
// is a second hook rather than a change to the first.
// ===========================================================================
import { useCallback, useEffect, useRef } from "react";
import type { UncontrolledFieldBinding } from "./field-binding.types.js";
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";

/** The same coercion buildInputProps applies, so both hooks agree on empty. */
const displayValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

export function useUncontrolledField<TValue>(
  path: string
): UncontrolledFieldBinding<TValue> {
  const form = useForm();
  const handle = form.field(path);

  // The channels a message is drawn from. NOT the value: subscribing to that
  // is precisely what this hook exists not to do.
  const issues = useCell(handle.sources.issues);
  const isTouched = useCell(handle.sources.touched);
  const isParticipating = useCell(handle.sources.participating);

  const node = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const writeToDom = (): void => {
      const element = node.current;
      if (element === null) return;
      const next = displayValue(handle.sources.value.read());
      // Only when it actually differs. After a keystroke the cell holds what
      // the user just typed, so this is a no-op — and assigning `value` on a
      // focused input moves the caret to the end even when the string is
      // identical, which would make typing in the middle of a word impossible.
      if (element.value !== next) element.value = next;
    };

    // Between render and this effect a reset could already have landed, so the
    // node is reconciled once before the subscription rather than only on the
    // next notification.
    writeToDom();
    return handle.sources.value.subscribe(writeToDom);
  }, [handle]);

  const onChange = useCallback(
    (event: { readonly currentTarget: { readonly value: string } }) =>
      handle.setValue(event.currentTarget.value as unknown as TValue),
    [handle]
  );
  const onBlur = useCallback(() => handle.markTouched(), [handle]);

  return {
    path: handle.path,
    descriptor: handle.descriptor,
    issues,
    isTouched,
    isParticipating,
    ref: node,
    // Read, not subscribed. React ignores a changed defaultValue after mount,
    // which is correct here: from then on the effect above owns the node.
    defaultValue: displayValue(handle.sources.value.read()),
    onChange,
    onBlur,
    setValue: (next) => handle.setValue(next),
    markTouched: () => handle.markTouched(),
    validate: () => handle.validate(),
    check: (candidate) => handle.check(candidate),
  };
}
