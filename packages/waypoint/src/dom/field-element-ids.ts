// ===========================================================================
// field-element-ids.ts — the ids a labelled field's elements address each
// other by, derived once, plus the three prop bags that carry them.
//
// A FILE NO FRAMEWORK OWNS. It takes the id scope as a string and returns
// strings, so the rule that a label, a help line and a message all point at
// one input is stated once for every binding there will be.
//
// A label, a help line and an error message all have to point at the SAME
// input, and in ordinary markup they are written by three different hands.
// Deriving the ids three times is exactly how they stop agreeing, so they are
// derived here and handed out together — and the prop bags are here too,
// rather than in the two builders, so a caller cannot pick up an `htmlFor`
// from one binding and an `id` from another.
//
// A bare path was NOT enough. A path is unique within ONE form and nothing
// more. Two forms on one page — a dialog over the page beneath it, the same
// component rendered twice — would both call their input `owner.name`, and a
// duplicate id sends `htmlFor` to whichever element the document happens to
// hold first. The same collision happens inside a single form, because a field
// here is addressed by path rather than by tree position: rendering
// `owner.name` in two components is legal and is sometimes the point.
//
// So the id is SCOPED, and the scope arrives as an argument. What a binding
// passes is the binding's business — React's `useId` is what the React one
// passes — and this file has no way to obtain one, which is the point. A
// module-level counter of our own was the obvious alternative and was
// rejected: it produces a different number on the server than in the browser,
// so every hydrated form would log a mismatch.
//
// The path stays in the id anyway. It costs nothing at run time and it is the
// difference between reading an accessibility tree and reading `«r7»-«r8»`.
// ===========================================================================
import type {
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
} from "./field-binding.types.js";

/** The ids one field's three elements use to address each other. */
export interface FieldElementIds {
  /** Goes on the control itself, and in the label's `htmlFor`. */
  readonly inputId: string;
  /** Goes on the help line, when the descriptor declares a description. */
  readonly descriptionId: string;
  /** Goes on whatever element carries this field's messages. */
  readonly errorId: string;
}

export function fieldElementIds(
  scope: string,
  path: string
): FieldElementIds {
  const inputId = `${scope}${path}`;
  return {
    inputId,
    descriptionId: `${inputId}-description`,
    errorId: `${inputId}-error`,
  };
}

export const labelPropsFor = (ids: FieldElementIds): FieldLabelProps => ({
  htmlFor: ids.inputId,
});

/**
 * Absent when the descriptor declared no description, because the element it
 * belongs on is then not drawn — and an `aria-describedby` pointing at an id
 * no element carries is worse than no `aria-describedby`: a screen reader
 * reads the attribute, finds nothing, and announces nothing where the author
 * clearly meant something.
 */
export const descriptionPropsFor = (
  ids: FieldElementIds,
  description: string | undefined
): FieldDescriptionProps | undefined =>
  description === undefined ? undefined : { id: ids.descriptionId };

/**
 * `role="alert"` is emitted, with two honest caveats.
 *
 * It makes the element an assertive live region, so a message that lands after
 * a validation pass interrupts whatever the screen reader was saying. That is
 * right for a message about the field the reader is in and wrong for a form
 * that re-judges on every keystroke, which is why it is a prop bag the caller
 * spreads rather than markup the library writes.
 *
 * And a live region announces reliably only when the element was already in
 * the document and its TEXT changed; several screen readers miss a region that
 * is inserted together with its first message. So a caller that wants the
 * announcement should render this element always and let it be empty — which
 * is what a reserved-height message line does anyway, to stop the form
 * reflowing. We have not put this in front of a real screen reader; the
 * behaviour above is what the ARIA practices describe, not something measured
 * here.
 */
export const errorPropsFor = (ids: FieldElementIds): FieldErrorProps => ({
  id: ids.errorId,
  role: "alert",
});
