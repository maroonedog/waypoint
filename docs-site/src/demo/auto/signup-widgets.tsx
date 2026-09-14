// ===========================================================================
// signup-widgets.tsx — the four components AutoForm draws with.
//
// This is layer 2, and it is the whole of the application's contribution: no
// field is named here, no path is named here, and nothing below knows which
// form it is drawing. A widget is handed the binding and decides what an input
// of that kind looks like — which is why the same four cover a schema that
// grows a field tomorrow.
//
// The registry is matched in a precedence order the package owns
// (`resolve-widget.ts`): `as` first, then declared path, then format, then
// `choices` for a closed field, then kind, then the fallback. What is here is
// the two cheapest rungs — `choices` and `byKind` — plus a fallback, because
// four entries is genuinely enough to draw this form and a demo that needed
// twelve would be arguing against itself.
// ===========================================================================
import type { ReactElement } from "react";
import type {
  FieldBinding,
  WidgetProps,
  WidgetRegistry,
} from "@maroonedog/waypoint/react";

/** The label, the complaint and the help text, which every widget wants. */
function Around({
  field,
  children,
}: {
  readonly field: FieldBinding<unknown>;
  readonly children: ReactElement;
}): ReactElement {
  const issue = field.issues[0];
  return (
    <div className="auto-field">
      <label {...field.labelProps} className="auto-label">
        {field.descriptor?.label ?? field.path}
        {field.descriptor?.isRequired === true ? (
          <span aria-hidden className="auto-required">
            *
          </span>
        ) : null}
      </label>
      {children}
      {field.descriptionProps === undefined ? null : (
        <p {...field.descriptionProps} className="auto-help">
          {field.descriptor?.description}
        </p>
      )}
      {issue === undefined ? null : (
        <p {...field.errorProps} className="auto-error">
          {issue.message}
        </p>
      )}
    </div>
  );
}

function TextWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <input
        {...field.inputProps}
        className="auto-input"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => field.setValue(event.target.value)}
        onBlur={() => field.markTouched()}
      />
    </Around>
  );
}

function NumberWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <input
        {...field.inputProps}
        type="number"
        className="auto-input"
        value={typeof field.value === "number" ? field.value : ""}
        onChange={(event) =>
          field.setValue(
            event.target.value === "" ? undefined : Number(event.target.value)
          )
        }
        onBlur={() => field.markTouched()}
      />
    </Around>
  );
}

function BooleanWidget({ field }: WidgetProps): ReactElement {
  return (
    <div className="auto-field auto-field-inline">
      <input
        {...field.inputProps}
        type="checkbox"
        className="auto-check"
        checked={field.value === true}
        onChange={(event) => field.setValue(event.target.checked)}
      />
      <label {...field.labelProps} className="auto-label">
        {field.descriptor?.label ?? field.path}
      </label>
    </div>
  );
}

// A CLOSED FIELD IS THE ONE THE SCHEMA ANSWERS BY ITSELF. The options are not
// written here: `descriptor.choices` is present exactly when the validator
// declared a finite set, and its presence is what routed the field to this
// widget in the first place.
function ChoiceWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <select
        {...field.inputProps}
        className="auto-input"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => field.setValue(event.target.value)}
        onBlur={() => field.markTouched()}
      >
        {(field.descriptor?.choices ?? []).map((choice) => (
          <option key={String(choice.value)} value={String(choice.value)}>
            {choice.label}
          </option>
        ))}
      </select>
    </Around>
  );
}

export const SIGNUP_WIDGETS: WidgetRegistry = {
  choices: ChoiceWidget,
  byKind: {
    number: NumberWidget,
    boolean: BooleanWidget,
  },
  fallback: TextWidget,
};
