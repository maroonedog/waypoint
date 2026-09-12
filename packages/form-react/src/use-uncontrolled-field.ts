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
import type { AddressablePath, DeclaredOf } from "form-contract";
import type { UncontrolledFieldBinding } from "./field-binding.types.js";
import { splitFormArgs } from "./split-form-args.js";
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type {
  AnyPath,
  AnyValues,
  FormKey,
  PathsFor,
  ValueOfPath,
  ValuesFor,
} from "./form-type-registry.js";

/** The same coercion buildInputProps applies, so both hooks agree on empty. */
const displayValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

export function useUncontrolledField<K extends AddressablePath<AnyPath>>(
  path: K
): UncontrolledFieldBinding<ValueOfPath<AnyValues, DeclaredOf<K>>>;
export function useUncontrolledField<
  TKey extends FormKey,
  K extends AddressablePath<PathsFor<TKey>>,
>(
  key: TKey,
  path: K
): UncontrolledFieldBinding<ValueOfPath<ValuesFor<TKey>, DeclaredOf<K>>>;
export function useUncontrolledField(
  first: string,
  second?: string
): UncontrolledFieldBinding<never> {
  const [formKey, path] = splitFormArgs(first, second);
  const form = useFormHandle(formKey);
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
      handle.setValue(event.currentTarget.value as never),
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
    issuesFor: (candidate) => handle.issuesFor(candidate),
  };
}
