// ===========================================================================
// widgets.tsx — every rung of the widget lookup, in one registry.
//
// This is the whole of what an application supplies to layer 1. Read it top to
// bottom and you have read the answer to "how do I change what AutoForm
// draws": you change this table, and you change it at the rung that is as
// specific as the change you want.
//
// THE ORDER, most specific first, from `resolve-widget.ts`:
//
//   byName    a name the CALLER wrote as `<Field as="compact" />`. AutoForm
//             never writes one, so this rung is reachable only from a hand
//             written Field — which is why screens.tsx has one.
//   byPath    this exact DECLARED path. One entry serves every row of a list.
//   byFormat  the constraint the validator named: "email", "date-time", …
//   choices   the field is closed. The options are on the descriptor, so the
//             widget lists them without being told what they are.
//   byKind    string | number | boolean | date | file | array | object
//   fallback  everything else, including a kind nothing here anticipated.
//
// A field that matches nothing at all is DRAWN BY NOTHING, and the form
// reports it rather than leaving a hole: `<Field>` tells the form's coverage
// that the path went undrawn. That is the reason a fallback is worth having
// even in an application that thinks it has covered every kind.
//
// Nothing below imports the schema, names a form, or knows which screen it is
// on. A widget is handed a binding and draws an input for it; that is the
// whole contract, and it is the same binding a `<Field>` children function
// gets — there is no separate widget API.
// ===========================================================================
import type { ReactElement } from "react";
import type {
  FieldBinding,
  WidgetProps,
  WidgetRegistry,
} from "@maroonedog/waypoint/react";

/** Label, help text and the complaint — the frame every input here wants. */
function Around({
  field,
  children,
}: {
  readonly field: FieldBinding<unknown>;
  readonly children: ReactElement;
}): ReactElement {
  return (
    <label className="field">
      <span>
        {field.descriptor?.label ?? field.path}
        {field.descriptor?.isRequired === true ? " *" : ""}
      </span>
      {children}
      {field.descriptionProps === undefined ? null : (
        <span {...field.descriptionProps} className="hint">
          {field.descriptor?.description}
        </span>
      )}
      <span {...field.errorProps} className="msg">
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}

/** The last rung. Anything with no better answer is a text input. */
function TextWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <input
        {...field.inputProps}
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => field.setValue(event.target.value)}
        onBlur={() => field.markTouched()}
      />
    </Around>
  );
}

/** `byName: "compact"`. Same input, no frame — for a row that is tight. */
function CompactTextWidget({ field }: WidgetProps): ReactElement {
  return (
    <input
      {...field.inputProps}
      aria-label={field.descriptor?.label ?? field.path}
      value={typeof field.value === "string" ? field.value : ""}
      onChange={(event) => field.setValue(event.target.value)}
      onBlur={() => field.markTouched()}
    />
  );
}

/** `byFormat: "email"`. The type comes off the format, not off the name. */
function EmailWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <input
        {...field.inputProps}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => field.setValue(event.target.value)}
        onBlur={() => field.markTouched()}
      />
    </Around>
  );
}

/** `choices`. The options are the descriptor's; this widget names none. */
function ChoiceWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <select
        {...field.inputProps}
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

/** `byKind: "number"`. The bounds are the schema's, spread from inputProps. */
function NumberWidget({ field }: WidgetProps): ReactElement {
  return (
    <Around field={field}>
      <input
        {...field.inputProps}
        type="number"
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

/** `byKind: "boolean"`. A checkbox puts its label after the box. */
function CheckboxWidget({ field }: WidgetProps): ReactElement {
  return (
    <label className="field row">
      <input
        {...field.inputProps}
        type="checkbox"
        checked={field.value === true}
        onChange={(event) => field.setValue(event.target.checked)}
      />
      <span>{field.descriptor?.label ?? field.path}</span>
    </label>
  );
}

/**
 * `byPath: "notes"`. One field, drawn differently, nothing else touched.
 *
 * The counter is why this field earns an entry of its own: the limit is the
 * SCHEMA's — `constraints.maxLength`, the same number `maxLength` on the
 * textarea comes from — so the widget states a bound it did not invent, and
 * changing `.max(300)` changes both.
 */
function NotesWidget({ field }: WidgetProps): ReactElement {
  const used = typeof field.value === "string" ? field.value.length : 0;
  const limit = field.descriptor?.constraints.maxLength;
  return (
    <Around field={field}>
      <span>
        <textarea
          {...field.inputProps}
          rows={3}
          style={{ width: "100%" }}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(event) => field.setValue(event.target.value)}
          onBlur={() => field.markTouched()}
        />
        <span className="hint">
          {limit === undefined ? `${used} characters` : `${used} / ${limit}`}
        </span>
      </span>
    </Around>
  );
}

/**
 * `byPath: "lines[*].qty"` — ONE ENTRY, EVERY ROW.
 *
 * The lookup matches the declared path, so this covers row 0 and row 7 and the
 * row somebody inserts in the middle. Keyed by a concrete `lines[0].qty` it
 * would cover exactly one row and would be pointing at the wrong one as soon
 * as the list moved.
 */
function StepperWidget({ field }: WidgetProps): ReactElement {
  const now = typeof field.value === "number" ? field.value : 1;
  const min = field.descriptor?.constraints.minimum ?? 1;
  const max = field.descriptor?.constraints.maximum;
  return (
    <Around field={field}>
      <span className="row">
        <button
          type="button"
          className="quiet"
          aria-label="One fewer"
          disabled={now <= min}
          onClick={() => field.setValue(now - 1)}
        >
          −
        </button>
        <input
          {...field.inputProps}
          type="number"
          style={{ width: "5rem" }}
          value={now}
          onChange={(event) => field.setValue(Number(event.target.value))}
          onBlur={() => field.markTouched()}
        />
        <button
          type="button"
          className="quiet"
          aria-label="One more"
          disabled={max !== undefined && now >= max}
          onClick={() => field.setValue(now + 1)}
        >
          +
        </button>
      </span>
    </Around>
  );
}

export const ORDER_WIDGETS: WidgetRegistry = {
  byName: { compact: CompactTextWidget },
  byPath: { notes: NotesWidget, "lines[*].qty": StepperWidget },
  byFormat: { email: EmailWidget },
  choices: ChoiceWidget,
  byKind: { number: NumberWidget, boolean: CheckboxWidget },
  fallback: TextWidget,
};

/**
 * The smallest table that still draws this form honestly.
 *
 * Every entry in a registry is optional, so `{ fallback }` alone is legal and
 * draws all eight fields. It is not what is here, and the missing rung is the
 * useful part of the lesson: a checkbox's value is `checked`, not `value`, so
 * one text widget cannot serve a boolean without quietly drawing a box that
 * does not follow the field. A kind needs its own rung exactly when the DOM
 * reads its value somewhere else.
 *
 * Everything that was a matter of taste is gone — the select, the counted
 * textarea, the stepper. What a screen still gets for free is what came off
 * the binding rather than out of a widget: `type`, `required`, the bounds and
 * the pattern are all on `inputProps`, so the plainest possible input still
 * carries what the schema declared.
 */
export const SMALLEST_TABLE: WidgetRegistry = {
  byKind: { boolean: CheckboxWidget },
  fallback: TextWidget,
};
