// ===========================================================================
// standard-form.types.ts — the contract a validator implements to be
// renderable as a form.
//
// The member is a single property named `~form`. The leading tilde sorts it
// last in an editor's completion list and makes a collision with a real field
// name unlikely, and holding everything under one property means implementing
// the contract adds one member rather than several.
//
// Validating and describing are separate faces on purpose. A validator that
// already implements a validation contract keeps doing so; this adds the
// description a renderer needs and takes nothing away. A schema may carry
// both, and neither one implies the other.
// ===========================================================================
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";

/** What a schema exposes under `~form`. */
export interface StandardFormProps {
  /** The contract's version. Only 1 exists. */
  readonly version: 1;
  /**
   * Who produced the description, for a renderer that needs to branch on it
   * and for an error message that has to name a source.
   */
  readonly vendor: string;
  /**
   * The declared fields, in declaration order. A function rather than an
   * array so a vendor may build the description only when it is asked for.
   */
  readonly fields: () => readonly FormFieldDescriptor[];
}

/** A schema that can describe itself as a form. */
export interface StandardFormV1 {
  readonly "~form": StandardFormProps;
}
