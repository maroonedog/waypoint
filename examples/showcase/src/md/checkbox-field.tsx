import type { ReactElement } from "react";
import type { FieldBinding } from "@maroonedog/form-contract/react";
import { SupportingText, isShowingError } from "./supporting-text.js";

/**
 * The MD3 checkbox, with the label as the target rather than beside it.
 *
 * The real input is the one the binding drew: `inputProps` carries
 * `type="checkbox"` and `checked`, and writes the boolean the box is in. What
 * is drawn on top of it is a square that reads the same cell, and the input
 * stays in the layout at full size and zero opacity so it keeps the keyboard
 * and the hit area a native checkbox has. It does NOT keep the focus ring:
 * `opacity-0` paints the native outline transparently too, so the square wears
 * the ring through `has-[:focus-visible]` instead.
 *
 * `aria-invalid` is overridden for the same reason the text field overrides it:
 * this form shows a field as wrong only once it has been touched. Without the
 * override the consent box is the worst case in the form — its rule is
 * cross-field, so typing anywhere makes the pass mark it invalid, and a screen
 * reader would call an untouched consent box invalid before anyone went near
 * it while the form shows nothing.
 *
 * `onClick` marks it touched, which `onBlur` alone would not: a checkbox is
 * answered by clicking it, and waiting for focus to leave would hold the
 * message back until the person had moved on to something else.
 */
export function MdCheckboxField({
  field,
  label,
  hint,
}: {
  field: FieldBinding<unknown>;
  label: string;
  hint?: string;
}): ReactElement {
  const checked = field.value === true;
  const wrong = isShowingError(field);
  return (
    <div className="w-full">
      <label
        {...field.labelProps}
        className="flex cursor-pointer items-start gap-3 py-1"
      >
        <span
          className={
            "state-layer relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border-2 transition-colors " +
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface " +
            (checked
              ? "border-primary bg-primary text-on-primary"
              : wrong
                ? "border-error"
                : "border-on-surface-variant")
          }
        >
          <input
            {...field.inputProps}
            aria-invalid={wrong ? true : undefined}
            onClick={() => field.markTouched()}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {checked ? (
            <span
              aria-hidden
              className="material-symbols-rounded text-[16px] leading-none"
            >
              check
            </span>
          ) : null}
        </span>
        <span className="text-sm text-on-surface">{label}</span>
      </label>
      <SupportingText field={field} hint={hint} />
    </div>
  );
}
