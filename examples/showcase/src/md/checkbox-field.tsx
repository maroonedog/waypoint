import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";
import { SupportingText, isShowingError } from "./supporting-text.js";

/** The MD3 checkbox, with the label as the target rather than beside it. */
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
      <label className="flex cursor-pointer items-start gap-3 py-1">
        <span
          className={
            "state-layer relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border-2 transition-colors " +
            (checked
              ? "border-primary bg-primary text-on-primary"
              : wrong
                ? "border-error"
                : "border-on-surface-variant")
          }
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              field.setValue(event.target.checked);
              field.markTouched();
            }}
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
