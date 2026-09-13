// ===========================================================================
// build-input-props.ts — a descriptor's field as DOM attributes and handlers.
//
// A FILE NO FRAMEWORK OWNS. It reads three members off a change event —
// `target.value`, `target.checked`, `target.files` — which is what
// `FieldChangeEventLike` names, so the handler parameter is that and not any
// framework's event. A binding gets the bag back under its own event type,
// because a parameter position accepts a wider type than it was asked for.
//
// The constraint half moved to input-attributes.ts, because the uncontrolled
// binding emits the same attributes and was making its callers re-derive them.
// What is left here is the half that differs: who holds the value, and what a
// keystroke means for the kind of field it landed in.
//
// Four kinds need more than "put the string in the cell", and each of them
// was a field this library could not previously draw at all:
//
//   boolean — a checkbox carries `checked`, not `value`, and the answer is
//   `event.target.checked`. Reading `value` off a checkbox returns the string
//   "on" whether or not it is ticked, which is why a checkbox wired the
//   text-input way looks like it works and then never turns off.
//
//   file — a file input carries NEITHER. It cannot be controlled at all: its
//   value is settable only to the empty string, and there is no way to put a
//   File back onto it. So this branch emits no `value` and no `checked`, the
//   node is the only holder of what was picked, and the cell is written from
//   `event.target.files?.[0]`. It has to be decided on `kind` and before the
//   generic tail, which would coerce for display and write `String(aFile)` —
//   `"[object File]"` — onto the element. That is also why `file` is a kind
//   and not a `format` on `string`: a format never reaches a branch at all.
//
//   number — the DOM hands back a string and the schema declared a number. The
//   coercion lives in number-from-typing.ts, along with the transient it
//   deliberately allows.
//
//   a closed field — the DOM hands back a string and the schema declared
//   whichever of string, number or boolean the choice was. Mapping it back is
//   the one thing a caller cannot do without re-deriving the choice list, so
//   it is the one thing done here.
//
// The value is coerced to a string for display because an input whose value
// is undefined is an UNCONTROLLED input as far as the DOM is concerned, and a
// field that switches between the two changes behaviour with nothing said.
// ===========================================================================
import type {
  FormFieldChoice,
  FormFieldDescriptor,
  FormIssue,
} from "../contract/index.js";
import type {
  FieldChangeEventLike,
  FieldInputPropsOf,
} from "./field-binding.types.js";
import type { FieldElementIds } from "./field-element-ids.js";
import { sharedInputAttributes } from "./input-attributes.js";
import {
  numberOrTextWhileTyping,
  numberWhenTypingStops,
} from "./number-from-typing.js";

export interface InputPropsRequest {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly value: unknown;
  readonly issues: readonly FormIssue[];
  readonly ids: FieldElementIds;
  /** Writes the cell. Already coerced by the time it is called. */
  readonly writeValue: (next: unknown) => void;
  readonly onBlur: () => void;
}

const displayValue = (value: unknown): string | number =>
  value === undefined || value === null
    ? ""
    : typeof value === "number"
      ? value
      : String(value);

/**
 * @returns the declared choice the selected string stands for, or the string
 * itself when it stands for none — which is the empty placeholder option a
 * `<select>` needs and no schema declares.
 */
const choiceValueFor = (
  choices: readonly FormFieldChoice[],
  selected: string
): string | number | boolean =>
  choices.find((choice) => String(choice.value) === selected)?.value ??
  selected;

export function buildInputProps(
  request: InputPropsRequest
): FieldInputPropsOf<FieldChangeEventLike> {
  const { descriptor, ids, issues, value } = request;
  const shared = sharedInputAttributes({
    path: request.path,
    descriptor,
    ids,
    hasIssues: issues.length > 0,
  });

  const choices = descriptor?.choices;
  if (choices !== undefined) {
    return {
      ...shared,
      value: displayValue(value),
      onChange: (event: FieldChangeEventLike) =>
        request.writeValue(choiceValueFor(choices, event.target.value)),
      onBlur: request.onBlur,
    };
  }

  if (descriptor?.kind === "boolean") {
    return {
      ...shared,
      checked: value === true,
      // `in` rather than a cast: only an input has `checked`, and the bag is
      // spreadable onto a textarea and a select too.
      onChange: (event: FieldChangeEventLike) =>
        request.writeValue(
          "checked" in event.target ? event.target.checked : false
        ),
      onBlur: request.onBlur,
    };
  }

  if (descriptor?.kind === "file") {
    return {
      ...shared,
      // `in` rather than a cast, for the reason the boolean branch gives: the
      // bag is spreadable onto a textarea and a select, and only an input has
      // `files`. An empty pick writes `undefined`, so clearing the chooser
      // clears the cell rather than leaving the last file in it.
      onChange: (event: FieldChangeEventLike) =>
        request.writeValue(
          "files" in event.target
            ? (event.target.files?.[0] ?? undefined)
            : undefined
        ),
      onBlur: request.onBlur,
    };
  }

  if (descriptor?.kind === "number") {
    return {
      ...shared,
      value: displayValue(value),
      onChange: (event: FieldChangeEventLike) =>
        request.writeValue(numberOrTextWhileTyping(event.target.value)),
      onBlur: () => {
        const asNumber = numberWhenTypingStops(value);
        if (asNumber !== undefined) request.writeValue(asNumber);
        request.onBlur();
      },
    };
  }

  return {
    ...shared,
    value: displayValue(value),
    onChange: (event: FieldChangeEventLike) =>
      request.writeValue(event.target.value),
    onBlur: request.onBlur,
  };
}
