// ===========================================================================
// form-field-constraints.types.ts — the renderable bounds of one field.
//
// Every member is optional because a constraint that was not declared is
// absent, not zero. A renderer distinguishes the two: `minLength: 0` writes
// `minlength="0"` onto the input, and an absent minLength writes nothing.
//
// Values are carried as they were declared and are not converted. A RegExp
// stays a RegExp: how a given renderer spells a pattern is that renderer's
// business, and converting here would make everyone pay for the one
// conversion some of them want. The same reasoning keeps `step` a number
// rather than a string.
// ===========================================================================

/** Bounds a renderer can put on an input without running validation. */
export interface FormFieldConstraints {
  /** Lowest accepted value, for a numeric or date field. */
  readonly minimum?: number;
  /** Highest accepted value, for a numeric or date field. */
  readonly maximum?: number;
  /** Shortest accepted string, or fewest accepted array elements. */
  readonly minLength?: number;
  /** Longest accepted string, or most accepted array elements. */
  readonly maxLength?: number;
  /** Granularity of a numeric field. */
  readonly step?: number;
  /** A string field's accepted shape. */
  readonly pattern?: RegExp;
  /**
   * A named shape a renderer may recognise to pick a specialised widget,
   * such as `email` or `date-time`. Unrecognised names are ignored rather
   * than rejected, so a vendor may emit its own.
   */
  readonly format?: string;
}
