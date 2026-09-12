import type { ReactElement } from "react";
import type { FieldBinding } from "@maroonedog/waypoint/react";
import { SupportingText, isShowingError } from "./supporting-text.js";

/**
 * A number field.
 *
 * This file used to bypass `inputProps` entirely and re-derive `name`, `min`,
 * `max` and `step` off the descriptor, because the bag wrote the raw string
 * into a number path and the validator then rejected every keystroke. That is
 * the binding's job now: it emits `type="number"`, it writes a number when the
 * text is that number's own spelling, and it lets a half-typed "1." or "-"
 * stand until the field is left. So what is left here is the appearance —
 * the floating label, the right alignment and the suffix — which is the only
 * part that was ever this file's business.
 *
 * `aria-invalid` is overridden for the reason text-field.tsx gives: this form
 * shows a field as wrong only once it has been touched.
 */
export function MdNumberField({
  field,
  label,
  hint,
  suffix,
}: {
  field: FieldBinding<unknown>;
  label: string;
  hint?: string;
  suffix?: string;
}): ReactElement {
  const wrong = isShowingError(field);
  const required = field.descriptor?.isRequired ?? false;

  return (
    <div className="w-full">
      <div className="relative rounded-t-xs bg-surface-highest">
        <input
          {...field.inputProps}
          placeholder=" "
          aria-invalid={wrong ? true : undefined}
          className={
            "peer w-full bg-transparent px-4 pb-2 pt-6 text-right text-base " +
            "text-on-surface outline-none placeholder:text-transparent" +
            (suffix === undefined ? "" : " pr-10")
          }
        />
        <label
          {...field.labelProps}
          className={
            "pointer-events-none absolute left-4 top-4 origin-left text-base transition-all duration-150 " +
            "peer-focus:top-2 peer-focus:text-xs " +
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs " +
            (wrong
              ? "text-error peer-focus:text-error"
              : "text-on-surface-variant peer-focus:text-primary")
          }
        >
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </label>
        {suffix === undefined ? null : (
          <span className="pointer-events-none absolute bottom-2 right-4 text-sm text-on-surface-variant">
            {suffix}
          </span>
        )}
        <span
          className={
            "pointer-events-none absolute inset-x-0 bottom-0 transition-all " +
            (wrong
              ? "h-0.5 bg-error"
              : "h-px bg-on-surface-variant peer-focus:h-0.5 peer-focus:bg-primary")
          }
        />
      </div>
      <SupportingText field={field} hint={hint} />
    </div>
  );
}
