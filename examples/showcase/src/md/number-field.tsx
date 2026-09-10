import type { ReactElement } from "react";
import type { FieldBinding } from "form-react";
import { SupportingText, isShowingError } from "./supporting-text.js";

/**
 * A number field.
 *
 * The DOM hands back a string and the schema declares a number, so something
 * has to convert. It happens here rather than in the runtime because what an
 * empty box means is a product decision: this one reads it as "no value", and
 * a form that wanted it read as zero would supply a different widget without
 * anything else changing.
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
  const constraints = field.descriptor?.constraints;

  return (
    <div className="w-full">
      <div className="relative rounded-t-xs bg-surface-highest">
        <input
          type="number"
          name={field.inputProps.name}
          value={typeof field.value === "number" ? field.value : ""}
          min={constraints?.minimum}
          max={constraints?.maximum}
          step={constraints?.step}
          placeholder=" "
          aria-invalid={wrong}
          onChange={(event) => {
            const raw = event.target.value;
            field.setValue(raw === "" ? undefined : Number(raw));
          }}
          onBlur={() => field.markTouched()}
          className={
            "peer w-full bg-transparent px-4 pb-2 pt-6 text-right text-base " +
            "text-on-surface outline-none placeholder:text-transparent" +
            (suffix === undefined ? "" : " pr-10")
          }
        />
        <span
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
        </span>
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
