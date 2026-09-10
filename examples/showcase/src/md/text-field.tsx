import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";
import { SupportingText, isShowingError } from "./supporting-text.js";

export interface TextFieldProps {
  readonly field: FieldBinding<unknown>;
  readonly label: string;
  readonly hint?: string;
  readonly type?: string;
  readonly multiline?: boolean;
  readonly leading?: string;
}

/**
 * The MD3 filled text field. The label floats on focus or once the input holds
 * something, which is done with `placeholder-shown` rather than with state, so
 * nothing here re-renders to move a label.
 */
export function MdTextField(props: TextFieldProps): ReactElement {
  const { field, label, hint, type, multiline, leading } = props;
  const wrong = isShowingError(field);
  const required = field.descriptor?.isRequired ?? false;

  const control =
    "peer w-full bg-transparent px-4 pb-2 pt-6 text-base text-on-surface " +
    "outline-none placeholder:text-transparent" +
    (leading === undefined ? "" : " pl-12");

  const floating =
    "pointer-events-none absolute left-4 top-4 origin-left text-base " +
    "transition-all duration-150 " +
    "peer-focus:top-2 peer-focus:text-xs " +
    "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs " +
    (wrong
      ? "text-error peer-focus:text-error"
      : "text-on-surface-variant peer-focus:text-primary") +
    (leading === undefined ? "" : " left-12");

  return (
    <div className="w-full">
      <div className="relative rounded-t-xs bg-surface-highest">
        {leading === undefined ? null : (
          <span
            aria-hidden
            className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          >
            {leading}
          </span>
        )}
        {multiline === true ? (
          <textarea
            {...field.inputProps}
            rows={3}
            placeholder=" "
            aria-invalid={wrong}
            className={control + " resize-y"}
          />
        ) : (
          <input
            {...field.inputProps}
            type={type ?? "text"}
            placeholder=" "
            aria-invalid={wrong}
            className={control}
          />
        )}
        <span className={floating}>
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </span>
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
