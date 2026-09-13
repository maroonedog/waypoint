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
//
// It emits the same `inputProps` as `useField`, minus the value. It used to
// emit none, which meant the binding the benchmark recommends was the one that
// made every caller re-derive the descriptor by hand.
//
// It takes a PLACE for the same reason `useField` does: it reaches the same
// field handle, and one DOM node holds one value.
//
// A FILE FIELD IS THE ONE THAT NEVER GETS WRITTEN BACK. The effect below
// reconciles the node from the cell, and for `<input type="file">` there is
// nothing it may write: the DOM allows a file input's `value` to be assigned
// only the empty string, so `element.value = String(aFile)` is not a bad
// display but a thrown `InvalidStateError`. It is also the one kind where the
// write is pointless in principle — a page cannot put a file into a chooser
// the person did not pick — so the cell follows the node here and never leads
// it, which is the only direction that was ever available.
// ===========================================================================
import { useCallback, useContext, useEffect, useId, useRef } from "react";
import type {
  UncontrolledChangeEvent,
  UncontrolledFieldBinding,
} from "./field-binding.types.js";
import { buildUncontrolledInputProps } from "./build-uncontrolled-input-props.js";
import {
  descriptionPropsFor,
  errorPropsFor,
  fieldElementIds,
  labelPropsFor,
} from "./field-element-ids.js";
import {
  numberOrTextWhileTyping,
  numberWhenTypingStops,
} from "./number-from-typing.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import { decorateElement } from "./decorate-element.js";
import { visibleIssues } from "./issue-visibility.js";
import { IssueVisibilityContext } from "./issue-visibility-context.js";
import { wordedIssues } from "./form-message.js";
import { FormMessageContext } from "./form-message-context.js";
import type { FieldOptions } from "./bind-field.js";
import type { FieldPart } from "./field-binding.types.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "./waypoint-forms.js";

/** The same coercion buildInputProps applies, so both hooks agree on empty. */
const displayValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

export function useUncontrolledField<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>,
  options?: FieldOptions
): UncontrolledFieldBinding<ValueAtFormPath<Q>>;
export function useUncontrolledField(
  spelling: string,
  options?: FieldOptions
): UncontrolledFieldBinding<never> {
  const { form, path } = useFormForPath(spelling);
  const handle = form.field(path);
  // Same claim as the controlled hook makes, for the same reason: whoever
  // called this is going to put the place on the screen. Not drawing the
  // value is what this hook is for; not drawing the FIELD is not.
  form.coverage.addressed(handle.path);

  // The channels a message is drawn from. NOT the value: subscribing to that
  // is precisely what this hook exists not to do.
  const produced = useCell(handle.sources.issues);
  const isTouched = useCell(handle.sources.touched);
  const isParticipating = useCell(handle.sources.participating);
  const submitCount = useCell(form.submitCount);
  const inherited = useContext(IssueVisibilityContext);
  const inheritedMessage = useContext(FormMessageContext);
  // `isDirty` is not subscribed here — see the header on what this binding
  // refuses to subscribe to — so `"dirty"` is read off the cell rather than
  // watched. A field asking for it re-renders when its issues or its touched
  // flag move, which is every moment this list could change anyway.
  const issues = wordedIssues(
    visibleIssues(produced, {
      visibility: options?.showIssues ?? inherited,
      isTouched,
      isDirty: handle.sources.dirty.read(),
      submitCount,
    }),
    options?.messageFor ?? inheritedMessage,
    handle.descriptor
  );

  const node = useRef<HTMLInputElement | null>(null);
  const isCheckbox = handle.descriptor?.kind === "boolean";
  const isNumber = handle.descriptor?.kind === "number";
  const isFileChooser = handle.descriptor?.kind === "file";

  useEffect(() => {
    const writeToDom = (): void => {
      const element = node.current;
      if (element === null) return;
      // See the header: a file input takes no value from the page at all.
      if (isFileChooser) return;
      const held = handle.sources.value.read();
      // A checkbox holds its answer in `checked`; its `value` is the string
      // "on" whether or not it is ticked, so writing there would look like it
      // worked and change nothing.
      if (isCheckbox) {
        const next = held === true;
        if (element.checked !== next) element.checked = next;
        return;
      }
      const next = displayValue(held);
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
  }, [handle, isCheckbox, isFileChooser]);

  const onChange = useCallback(
    (event: UncontrolledChangeEvent) => {
      const target = event.currentTarget;
      if (isCheckbox) {
        handle.setValue((target.checked === true) as never);
        return;
      }
      // A file input's `value` is a fake path — "C:\fakepath\photo.png" — so
      // the answer is the file list, and an empty pick clears the cell.
      if (isFileChooser) {
        handle.setValue((target.files?.[0] ?? undefined) as never);
        return;
      }
      handle.setValue(
        (isNumber ? numberOrTextWhileTyping(target.value) : target.value) as never
      );
    },
    [handle, isCheckbox, isFileChooser, isNumber]
  );

  // A number that stood as text while it was being typed becomes a number when
  // the field is left. See number-from-typing.ts for which strings do not.
  const onBlur = useCallback(() => {
    if (isNumber) {
      const asNumber = numberWhenTypingStops(handle.sources.value.read());
      if (asNumber !== undefined) handle.setValue(asNumber as never);
    }
    handle.markTouched();
  }, [handle, isNumber]);

  const scope = useId();
  const ids = fieldElementIds(scope, handle.path);
  // Read, not subscribed. React ignores a changed default after mount, which
  // is correct here: from then on the effect above owns the node.
  const held = handle.sources.value.read();
  const shown = displayValue(held);

  return {
    path: handle.path,
    descriptor: handle.descriptor,
    issues,
    isTouched,
    isParticipating,
    ref: node,
    defaultValue: shown,
    onChange,
    onBlur,
    setValue: (next) => handle.setValue(next),
    markTouched: () => handle.markTouched(),
    validate: () => handle.validate(),
    issuesFor: (candidate) => handle.issuesFor(candidate),
    decorate: (element, part: FieldPart = "input") => {
      const bag =
        part === "label"
          ? labelPropsFor(ids)
          : part === "error"
            ? errorPropsFor(ids)
            : part === "description"
              ? descriptionPropsFor(ids, handle.descriptor?.description)
              : buildUncontrolledInputProps({
                  path: handle.path,
                  descriptor: handle.descriptor,
                  issues,
                  ids,
                  ref: node,
                  held,
                  defaultValue: shown,
                  onChange,
                  onBlur,
                });
      return bag === undefined
        ? element
        : decorateElement(element, bag as unknown as Record<string, unknown>);
    },
    inputProps: buildUncontrolledInputProps({
      path: handle.path,
      descriptor: handle.descriptor,
      issues,
      ids,
      ref: node,
      held,
      defaultValue: shown,
      onChange,
      onBlur,
    }),
    labelProps: labelPropsFor(ids),
    descriptionProps: descriptionPropsFor(ids, handle.descriptor?.description),
    errorProps: errorPropsFor(ids),
  };
}
