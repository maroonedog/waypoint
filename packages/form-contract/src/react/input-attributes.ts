// ===========================================================================
// input-attributes.ts — the half of a field's props that both bindings emit.
//
// `useField` and `useUncontrolledField` differ in exactly one thing: where the
// value lives. Everything else on the element — its id, its name, the type the
// descriptor implies, the bounds the schema declared, and what a screen reader
// is told — is the same fact stated twice, and it WAS stated twice: an
// uncontrolled caller had to re-derive `min`, `max`, `minLength`, `maxLength`,
// `step` and `pattern` off `descriptor.constraints` by hand, which is the
// duplication the descriptor exists to abolish. So it is stated here once and
// both builders spread it.
//
// A constraint that was not declared produces no attribute, as before: writing
// `minlength="0"` for a field with no minimum states a rule the validator does
// not hold, and the browser would then enforce something nobody declared.
//
// `aria-required` is NOT emitted, and readers will ask why. `required` is
// already on the element, and a native control maps it to the same thing an
// assistive technology reads — `aria-required` on an input that already
// carries `required` is a second copy of one fact, and the copy is the one
// that goes stale. It would be worth emitting only for a widget with no native
// required, and this library authors no widgets.
//
// `aria-invalid` is emitted only when the field actually carries issues. The
// alternative, `aria-invalid={false}` on every field, is what a form looks like
// when nobody has typed in it yet, and stamping a negative assertion on forty
// untouched inputs says something about each of them that nothing has checked.
// ===========================================================================
import type { FormFieldDescriptor } from "../contract/index.js";
import type { FieldElementIds } from "./field-element-ids.js";

/** What both bindings put on the element, whatever holds the value. */
export interface SharedInputAttributes {
  readonly id: string;
  readonly name: string;
  readonly required: boolean;
  readonly type?: string;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly step?: number;
  readonly pattern?: string;
  readonly "aria-invalid"?: true;
  readonly "aria-describedby"?: string;
}

type MutableAttributes = {
  -readonly [K in keyof SharedInputAttributes]?: SharedInputAttributes[K];
};

export interface SharedInputRequest {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly ids: FieldElementIds;
  readonly hasIssues: boolean;
}

/** The input types a `string` field's declared format asks for. */
const TYPE_FOR_STRING_FORMAT: Readonly<Record<string, string>> = {
  email: "email",
  uri: "url",
  url: "url",
};

/** The input types a `date` field's declared format asks for. */
const TYPE_FOR_DATE_FORMAT: Readonly<Record<string, string>> = {
  "date-time": "datetime-local",
  time: "time",
};

/**
 * @returns the `type` attribute the descriptor implies, or undefined when it
 * implies none — a closed field, because its element is a `<select>` and a
 * type attribute on a select is not a weaker choice but an invalid one; and an
 * `array`, `object` or `unknown` field, because a vendor that would not say
 * what the field is has not said it is text either. An omitted type leaves a
 * bare `<input>` at its own default of text, so omitting costs a caller
 * nothing and claims nothing.
 */
export function inputTypeFor(
  descriptor: FormFieldDescriptor | undefined
): string | undefined {
  if (descriptor === undefined || descriptor.choices !== undefined) {
    return undefined;
  }
  const format = descriptor.constraints.format;
  switch (descriptor.kind) {
    case "number":
      return "number";
    case "boolean":
      return "checkbox";
    case "date":
      return (format === undefined ? undefined : TYPE_FOR_DATE_FORMAT[format]) ??
        "date";
    case "string":
      return (
        (format === undefined ? undefined : TYPE_FOR_STRING_FORMAT[format]) ??
        "text"
      );
    default:
      return undefined;
  }
}

export function sharedInputAttributes(
  request: SharedInputRequest
): SharedInputAttributes {
  const { descriptor, hasIssues, ids } = request;
  const attributes: MutableAttributes = {
    id: ids.inputId,
    name: request.path,
    required: descriptor?.isRequired ?? false,
  };

  const type = inputTypeFor(descriptor);
  if (type !== undefined) attributes.type = type;

  // A closed field is drawn as a `<select>`, which accepts none of these: a
  // `maxlength` on a list the person cannot type into is inert at best and a
  // lie about the element at worst.
  const constraints =
    descriptor === undefined || descriptor.choices !== undefined
      ? undefined
      : descriptor.constraints;
  if (constraints !== undefined) {
    if (constraints.minimum !== undefined) attributes.min = constraints.minimum;
    if (constraints.maximum !== undefined) attributes.max = constraints.maximum;
    if (constraints.minLength !== undefined) {
      attributes.minLength = constraints.minLength;
    }
    if (constraints.maxLength !== undefined) {
      attributes.maxLength = constraints.maxLength;
    }
    if (constraints.step !== undefined) attributes.step = constraints.step;
    if (constraints.pattern !== undefined) {
      attributes.pattern = constraints.pattern.source;
    }
  }

  if (hasIssues) attributes["aria-invalid"] = true;

  // The help line first and the message second, which is the order they are
  // read in: what the field wants, then what is wrong with what it was given.
  const describedBy = [
    descriptor?.description === undefined ? undefined : ids.descriptionId,
    hasIssues ? ids.errorId : undefined,
  ].filter((id): id is string => id !== undefined);
  if (describedBy.length > 0) {
    attributes["aria-describedby"] = describedBy.join(" ");
  }

  return attributes as SharedInputAttributes;
}
