import type { ReactElement } from "react";
import type { FieldBinding } from "@maroonedog/waypoint/react";

/**
 * The line under a field. It keeps its height whether or not anything is in
 * it, so a form does not reflow as errors appear and clear — which is also
 * what makes `field.errorProps` worth spreading here rather than onto an
 * element that appears with its first message: a `role="alert"` region that is
 * already in the document and merely changes text is the case screen readers
 * announce, and the one that is inserted along with its text is the case
 * several of them miss.
 *
 * It carries the error id and never the description id. The hints in this form
 * are application text — 「例: 100-0001」 is a wording decision, not something
 * the schema declared — so no descriptor here has a `description` and
 * `field.descriptionProps` is always undefined. A schema that did declare one
 * would want a second line, with that bag on it.
 */
export function SupportingText({
  field,
  hint,
}: {
  field: FieldBinding<unknown>;
  hint?: string;
}): ReactElement {
  const showError = field.isTouched && field.issues.length > 0;
  return (
    <p
      {...field.errorProps}
      className={
        "min-h-5 px-4 pt-1 text-xs " +
        (showError ? "text-error" : "text-on-surface-variant")
      }
    >
      {showError
        ? field.issues.map((issue) => issue.message).join(" / ")
        : (hint ?? " ")}
    </p>
  );
}

/** Whether a field should currently be drawn as wrong. */
export const isShowingError = (field: FieldBinding<unknown>): boolean =>
  field.isTouched && field.issues.length > 0;
