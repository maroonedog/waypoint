// ===========================================================================
// form-field-descriptor.types.ts — one field, as a renderer needs to see it.
//
// A descriptor says what to draw. It deliberately cannot say whether a value
// is valid: that answer belongs to the validator the descriptor came from,
// and duplicating it here would let the two disagree.
//
// `kind` is the widget decision and nothing more. It is not the field's
// TypeScript type and does not have to round-trip back to one — a validator
// that accepts a string carrying a date is free to describe it as `date`,
// because that is the input a person should be given.
// ===========================================================================
import type { FormFieldConstraints } from "./form-field-constraints.types.js";

/**
 * The families a renderer is expected to handle. `unknown` is the honest
 * answer when a vendor cannot decide, and a renderer is expected to fall
 * back rather than fail on it.
 */
export type FormFieldKind =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object"
  | "unknown";

/** One value a closed field accepts, with the text to show for it. */
export interface FormFieldChoice {
  readonly value: string | number | boolean;
  readonly label: string;
}

/** One declared field of a form. */
export interface FormFieldDescriptor {
  /**
   * Where the value lives in the form's value, written with dots for members
   * and `[*]` for array elements: `owner.name`, `items[*].quantity`.
   */
  readonly path: string;
  readonly kind: FormFieldKind;
  /** True when the field must carry a value for the form to be submittable. */
  readonly isRequired: boolean;
  readonly constraints: FormFieldConstraints;
  /**
   * Present only on a closed field. Its presence is what tells a renderer to
   * offer a choice widget instead of a free input, so an open field omits it
   * rather than carrying an empty list.
   */
  readonly choices?: readonly FormFieldChoice[];
}
