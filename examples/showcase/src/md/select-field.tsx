import type { ReactElement } from "react";
import type { FieldBinding } from "@maroonedog/waypoint/react";
import { SupportingText, isShowingError } from "./supporting-text.js";

export interface SelectFieldProps {
  readonly field: FieldBinding<unknown>;
  readonly label: string;
  readonly hint?: string;
}

/**
 * The MD3 filled select. The options come from the descriptor when the vendor
 * declared a closed field, so a schema that adds a case adds an option without
 * this file changing.
 *
 * `inputProps` is spread onto the `<select>` rather than an `<input>`, which is
 * the whole of what the library does for a closed field: it omits the `type`
 * and the input-only bounds a select cannot carry, and its `onChange` turns
 * the string the DOM hands back into the value the schema declared. Only the
 * choice list knows that the string "2" means the number 2, and re-deriving
 * that list here is the duplication the descriptor exists to abolish.
 *
 * There is deliberately no `options` prop to fall back on. A descriptor with
 * no `choices` is not a closed field, so `inputProps` takes its other branch
 * and would put `type="text"`, `minlength` and `pattern` on a `<select>` —
 * and a caller who wants a list the schema does not declare is writing the
 * duplication above with extra steps. Declare the enum.
 *
 * `aria-invalid` is overridden for the reason text-field.tsx gives: this form
 * shows a field as wrong only once it has been touched.
 */
export function MdSelectField({
  field,
  label,
  hint,
}: SelectFieldProps): ReactElement {
  const wrong = isShowingError(field);
  const required = field.descriptor?.isRequired ?? false;
  const choices = field.descriptor?.choices ?? [];

  return (
    <div className="w-full">
      <div className="relative rounded-t-xs bg-surface-highest">
        <select
          {...field.inputProps}
          aria-invalid={wrong ? true : undefined}
          className="w-full appearance-none bg-transparent px-4 pb-2 pt-6 text-base text-on-surface outline-none"
        >
          <option value="">選択してください</option>
          {choices.map((choice) => (
            <option key={String(choice.value)} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
        </select>
        <label
          {...field.labelProps}
          className={
            "pointer-events-none absolute left-4 top-2 text-xs " +
            (wrong ? "text-error" : "text-on-surface-variant")
          }
        >
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </label>
        <span
          aria-hidden
          className="material-symbols-rounded pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
        >
          arrow_drop_down
        </span>
        <span
          className={
            "pointer-events-none absolute inset-x-0 bottom-0 " +
            (wrong ? "h-0.5 bg-error" : "h-px bg-on-surface-variant")
          }
        />
      </div>
      <SupportingText field={field} hint={hint} />
    </div>
  );
}
