import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";
import { SupportingText } from "./supporting-text.js";

/**
 * MD3 filter chips over a closed field. Used where the options are few enough
 * that hiding them behind a menu costs more than it saves.
 */
export function MdChoiceChips({
  field,
  label,
  hint,
  labels,
}: {
  field: FieldBinding<unknown>;
  label: string;
  hint?: string;
  /**
   * What to show for each value. The schema decides which values EXIST — add
   * a case and the chip appears here — and the application decides what they
   * are called, because a validator has no opinion about language.
   */
  labels?: Readonly<Record<string, string>>;
}): ReactElement {
  const choices = field.descriptor?.choices ?? [];
  const shown = (value: string | number | boolean, fallback: string): string =>
    labels?.[String(value)] ?? fallback;
  const held = String(field.value ?? "");
  return (
    <div className="w-full">
      <p className="px-1 pb-2 text-sm text-on-surface-variant">
        {label}
        {field.descriptor?.isRequired === true ? (
          <span className="text-error"> *</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const chosen = held === String(choice.value);
          return (
            <button
              key={String(choice.value)}
              type="button"
              onClick={() => {
                field.setValue(choice.value);
                field.markTouched();
              }}
              className={
                "state-layer relative overflow-hidden rounded-sm border px-4 py-2 text-sm transition-colors " +
                (chosen
                  ? "border-transparent bg-secondary-container text-on-secondary-container"
                  : "border-outline text-on-surface-variant")
              }
            >
              {chosen ? (
                <span
                  aria-hidden
                  className="material-symbols-rounded mr-1 align-[-4px] text-[18px]"
                >
                  check
                </span>
              ) : null}
              {shown(choice.value, choice.label)}
            </button>
          );
        })}
      </div>
      <SupportingText field={field} hint={hint} />
    </div>
  );
}
