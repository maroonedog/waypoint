import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";

/**
 * The line under a field. It keeps its height whether or not anything is in
 * it, so a form does not reflow as errors appear and clear.
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
      className={
        "min-h-5 px-4 pt-1 text-xs " +
        (showError ? "text-error" : "text-on-surface-variant")
      }
    >
      {showError
        ? field.issues.map((issue) => issue.message).join(" / ")
        : (hint ?? " ")}
    </p>
  );
}

/** Whether a field should currently be drawn as wrong. */
export const isShowingError = (field: FieldBinding<unknown>): boolean =>
  field.isTouched && field.issues.length > 0;
