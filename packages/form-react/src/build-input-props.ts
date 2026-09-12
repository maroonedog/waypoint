// ===========================================================================
// build-input-props.ts — a descriptor's field as DOM attributes and handlers.
//
// The constraint half moved to input-attributes.ts, because the uncontrolled
// binding emits the same attributes and was making its callers re-derive them.
// What is left here is the half that differs: who holds the value, and what a
// keystroke means for the kind of field it landed in.
//
// Three kinds need more than "put the string in the cell", and each of them
// was a field this library could not previously draw at all:
//
//   boolean — a checkbox carries `checked`, not `value`, and the answer is
//   `event.target.checked`. Reading `value` off a checkbox returns the string
//   "on" whether or not it is ticked, which is why a checkbox wired the
//   text-input way looks like it works and then never turns off.
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
// The value is coerced to a string for display because a controlled input
// whose value is undefined is an UNCONTROLLED input, and React changes its
// behaviour silently when a field switches between the two.
// ===========================================================================
import type {
  FormFieldChoice,
  FormFieldDescriptor,
  FormIssue,
} from "form-contract";
import type {
  FieldChangeEvent,
  FieldInputProps,
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

export function buildInputProps(request: InputPropsRequest): FieldInputProps {
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
      onChange: (event: FieldChangeEvent) =>
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
      onChange: (event: FieldChangeEvent) =>
        request.writeValue(
          "checked" in event.target ? event.target.checked : false
        ),
      onBlur: request.onBlur,
    };
  }

  if (descriptor?.kind === "number") {
    return {
      ...shared,
      value: displayValue(value),
      onChange: (event: FieldChangeEvent) =>
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
    onChange: (event: FieldChangeEvent) =>
      request.writeValue(event.target.value),
    onBlur: request.onBlur,
  };
}
