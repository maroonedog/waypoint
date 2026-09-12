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
//
// `label` and `description` are QUOTED prose: whatever the schema itself
// declared, or the member is absent. Nothing derives them from the path, so a
// renderer can tell a name the author chose from no name at all.
//
// `FormFieldChoice.label` is the exception and is not held to that rule. A
// choice has to be drawable, so a resolver with nothing better falls back to
// the value's own spelling — the zod path uses the enum key, the JSON Schema
// path uses `String(value)`. A renderer that needs to know which it got has
// to ask the schema, and that is the price of not shipping an empty label.
// ===========================================================================
import type { FormFieldConstraints } from "./form-field-constraints.types.js";

/**
 * The families a renderer is expected to handle. `unknown` is the honest
 * answer when a vendor cannot decide, and a renderer is expected to fall
 * back rather than fail on it.
 *
 * `file` is `<input type="file">`, and the cell holds a `File`. It is a KIND
 * rather than a `format` on `string` because the widget decision is taken on
 * `kind`: build-input-props.ts branches on it to decide WHO HOLDS THE VALUE,
 * and a file input is the one input that cannot be controlled at all. A format
 * would never reach a branch that omits `value`, so it would have been drawn
 * by the generic tail — which writes `String(value)`, and `String(aFile)` is
 * `"[object File]"`.
 *
 * ONE file. `multiple` is deliberately not describable: a multi-file pick is
 * one event replacing a whole list at once, and `rows()` offers append, remove
 * and move with no replace-the-list edit to express it. That is a change to
 * the array runtime, not to this union.
 */
export type FormFieldKind =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "file"
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
  /**
   * The accessible name, as the schema declared it — a zod `.meta({ title })`,
   * a JSON Schema `title`.
   *
   * Optional deliberately. A validator that declares no title must not have
   * one invented for it from the path: turning `owner.name` into "Owner name"
   * decides casing, wording and language, which is UI text policy and belongs
   * to the application — the only layer that knows what its readers speak. So
   * the absence is reported as an absence, and the renderer chooses.
   */
  readonly label?: string;
  /**
   * Help text, as the schema declared it — a zod `.describe()` or
   * `.meta({ description })`, a JSON Schema `description`.
   *
   * Absent rather than empty when the schema said nothing, for the reason
   * `label` is: there is no honest default to derive from a path.
   */
  readonly description?: string;
  readonly constraints: FormFieldConstraints;
  /**
   * Present only on a closed field. Its presence is what tells a renderer to
   * offer a choice widget instead of a free input, so an open field omits it
   * rather than carrying an empty list.
   */
  readonly choices?: readonly FormFieldChoice[];
}
