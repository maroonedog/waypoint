import type { ReactElement } from "react";
import type { FieldBinding } from "@maroonedog/waypoint/react";
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
 *
 * What it no longer spells: the id, the name, the type, the declared bounds
 * and the `htmlFor` tying the floating label to the control. Those come out of
 * `field.inputProps` and `field.labelProps`. The floating label used to be a
 * `<span>`, which looked right and left the input with no accessible name at
 * all; it is a real `<label>` now, addressing the id the binding emitted.
 *
 * Two things are still hand-written, deliberately:
 *
 * `type` from the caller wins over the type the descriptor implies. The schema
 * declares 生年月日 as a string, because that is what it stores, so the
 * descriptor says `text` and only the application knows it wants a date
 * picker. The descriptor's type is the fallback rather than the override.
 *
 * `aria-invalid` is overridden because this form shows a field as wrong only
 * once it has been TOUCHED, and the binding emits it as soon as the field
 * carries an issue — which is before the person has typed anything. Note the
 * override removes the attribute rather than setting it to false: a form of
 * forty untouched inputs each asserting `aria-invalid="false"` is forty
 * assertions nothing has checked.
 */
export function MdTextField(props: TextFieldProps): ReactElement {
  const { field, label, hint, type, multiline, leading } = props;
  const wrong = isShowingError(field);
  const required = field.descriptor?.isRequired ?? false;
  const { type: declaredType, ...shared } = field.inputProps;

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
            {...shared}
            rows={3}
            placeholder=" "
            aria-invalid={wrong ? true : undefined}
            className={control + " resize-y"}
          />
        ) : (
          <input
            {...shared}
            type={type ?? declaredType}
            placeholder=" "
            aria-invalid={wrong ? true : undefined}
            className={control}
          />
        )}
        <label className={floating} {...field.labelProps}>
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </label>
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
