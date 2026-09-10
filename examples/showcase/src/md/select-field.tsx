import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";
import { SupportingText, isShowingError } from "./supporting-text.js";

export interface SelectFieldProps {
  readonly field: FieldBinding<unknown>;
  readonly label: string;
  readonly hint?: string;
  /** Offered when the descriptor names no choices of its own. */
  readonly options?: readonly { readonly value: string; readonly label: string }[];
}

/**
 * The MD3 filled select. The options come from the descriptor when the vendor
 * declared a closed field, so a schema that adds a case adds an option without
 * this file changing.
 */
export function MdSelectField(props: SelectFieldProps): ReactElement {
  const { field, label, hint } = props;
  const wrong = isShowingError(field);
  const required = field.descriptor?.isRequired ?? false;
  const choices =
    field.descriptor?.choices ??
    (props.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
    }));

  return (
    <div className="w-full">
      <div className="relative rounded-t-xs bg-surface-highest">
        <select
          name={field.inputProps.name}
          value={String(field.value ?? "")}
          onChange={(event) => field.setValue(event.target.value)}
          onBlur={() => field.markTouched()}
          aria-invalid={wrong}
          className="w-full appearance-none bg-transparent px-4 pb-2 pt-6 text-base text-on-surface outline-none"
        >
          <option value="">選択してください</option>
          {choices.map((choice) => (
            <option key={String(choice.value)} value={String(choice.value)}>
              {choice.label}
            </option>
          ))}
        </select>
        <span
          className={
            "pointer-events-none absolute left-4 top-2 text-xs " +
            (wrong ? "text-error" : "text-on-surface-variant")
          }
        >
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </span>
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
