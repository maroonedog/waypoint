// ===========================================================================
// screens.tsx — the three things you do with layer 1.
//
// `WholeForm` is AutoForm drawing everything, which is the case the widget
// table already answers. `PartlyByHand` is the case it does not: a field this
// screen wants to draw itself, reached with `only` and written as ordinary
// layer-3 code in the same provider. `SwappedTable` is the claim those two
// rest on, made checkable: the registry is the design, so changing the
// registry changes the design and nothing else moves.
//
// All three build the same form from the same adapter. Three handles, one
// registered key — the key names which DECLARATION a path is checked against,
// not which instance is on screen, so three independent forms can answer to
// `auto:` at once.
// ===========================================================================
import {
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  AutoForm,
  Field,
  FormProvider,
  useCreateForm,
  useForm,
  useFormStatus,
  type RowsBinding,
} from "@maroonedog/waypoint/react";
import { orderAdapter } from "./waypoint-forms.js";
import { EMPTY_ORDER, blankLine } from "./schema.js";
import { ORDER_WIDGETS, SMALLEST_TABLE } from "./widgets.js";

/**
 * One pass at mount, because `errorCount` is the verdict of the LAST pass and
 * a form nobody has typed into has had none. Without it the bar below opens on
 * "nothing to fix" over three empty required fields.
 */
function useJudgedAtMount(form: { validate(): unknown }): void {
  useEffect(() => {
    void form.validate();
  }, [form]);
}

function Bar(): ReactElement {
  const form = useForm();
  const { errorCount } = useFormStatus();
  return (
    <p className="spread">
      <span>
        {errorCount === 0 ? "Nothing to fix" : `${errorCount} field(s) to fix`}
      </span>
      <button type="button" className="quiet" onClick={() => form.reset()}>
        Reset
      </button>
    </p>
  );
}

// ===========================================================================
// 1. Everything drawn by the table.
// ===========================================================================

/**
 * `renderList` IS THE ONLY THING A LIST NEEDS FROM THE APPLICATION.
 *
 * AutoForm draws the rows; what surrounds them — the heading, the add button,
 * the remove button, whether a row is a card or a table row — is not something
 * a library can know, so it is handed back. The binding is the same
 * `RowsBinding` `useRows` returns, so `insert`, `remove` and `rows` are here
 * without a hook and without a path.
 */
function OrderLines(binding: RowsBinding, rows: ReactNode): ReactNode {
  return (
    <section>
      <h2>Order lines</h2>
      {rows}
      <p className="row">
        <button
          type="button"
          onClick={() => binding.insert(binding.rows.length, blankLine())}
        >
          Add a line
        </button>
        <button
          type="button"
          className="quiet"
          disabled={binding.rows.length <= 1}
          onClick={() => binding.remove(binding.rows.length - 1)}
        >
          Remove the last
        </button>
      </p>
    </section>
  );
}

export function WholeForm(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    key: "auto",
    defaultValues: structuredClone(EMPTY_ORDER),
  }));
  useJudgedAtMount(form);

  return (
    <section>
      <h2>Everything, drawn by the table</h2>
      <p className="note">
        No component below is written per field. Eight inputs, and each one
        found its widget at a different rung: <code>notes</code> and{" "}
        <code>lines[*].qty</code> by path, the receipt address by its{" "}
        <code>email</code> format, <code>priority</code> because it is closed,{" "}
        <code>seats</code> and <code>giftWrap</code> by kind, and the two
        remaining strings by the fallback.
      </p>
      <FormProvider form={form} widgets={ORDER_WIDGETS} showIssues="touched">
        <AutoForm renderList={OrderLines} />
        <Bar />
      </FormProvider>
    </section>
  );
}

// ===========================================================================
// 2. Most of it drawn by the table, one field drawn here.
// ===========================================================================

export function PartlyByHand(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    key: "auto",
    defaultValues: structuredClone(EMPTY_ORDER),
  }));
  useJudgedAtMount(form);

  return (
    <section>
      <h2>Most of it drawn, one field written</h2>
      <p className="note">
        <code>only</code> names the top-level declarations AutoForm should
        draw, and everything it does not name is ordinary layer-3 code in the
        same provider. There is no <code>partial</code> here: between them the
        two halves address every declared field, so the coverage check has
        nothing to report.
      </p>
      <FormProvider form={form} widgets={ORDER_WIDGETS} showIssues="touched">
        <AutoForm
          only={[
            "auto:reference",
            "auto:email",
            "auto:seats",
            "auto:giftWrap",
            "auto:notes",
            "auto:lines[*]",
          ]}
          renderList={OrderLines}
        />

        {/* WRITTEN HERE, and for a reason the table could not express: three
            buttons rather than a select, because this screen wants the choice
            visible at a glance. The options are still the descriptor's — a
            children function gets the same binding a widget gets, so nothing
            about the field is retyped except the shape of the control. */}
        <Field path="auto:priority">
          {(field) => (
            <div className="field">
              <span>{field.descriptor?.label}</span>
              <span className="row">
                {(field.descriptor?.choices ?? []).map((choice) => (
                  <button
                    key={String(choice.value)}
                    type="button"
                    aria-pressed={field.value === choice.value}
                    className={field.value === choice.value ? "" : "quiet"}
                    onClick={() => field.setValue(choice.value as typeof field.value)}
                  >
                    {choice.label}
                  </button>
                ))}
              </span>
              <span {...field.errorProps} className="msg">
                {field.issues[0]?.message ?? ""}
              </span>
            </div>
          )}
        </Field>

        <Bar />
      </FormProvider>
    </section>
  );
}

// ===========================================================================
// 3. The registry, swapped while the form is running.
// ===========================================================================

/**
 * The same form, the same fields, two registries.
 *
 * It is here because "change the table" is the answer to every design question
 * on this page, and a sentence saying so is weaker than a button that does it.
 * Nothing below the provider is re-mounted or re-written; the widget lookup
 * simply finds a different component, and the values in the store do not move.
 */
export function SwappedTable(): ReactElement {
  const [plain, setPlain] = useState(false);
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    key: "auto",
    defaultValues: structuredClone(EMPTY_ORDER),
  }));

  // Every rung that was a matter of taste, taken away: no select, no counted
  // textarea, no stepper. MEASURED RATHER THAN GUESSED — the plain inputs
  // still come out `type="email"` and `type="number"`, because the type is on
  // `inputProps` and `inputProps` is built from the descriptor. A widget
  // decides the CONTROL; the schema decides what the control is told.
  const registry = plain ? SMALLEST_TABLE : ORDER_WIDGETS;

  return (
    <section>
      <h2>The same form, a different table</h2>
      <p className="note">
        One button, and the only thing it changes is which registry is on the
        provider. Type into a field first: the values stay where they are,
        because the store never knew which component was drawing them. Look at
        what survives, too — the plain inputs are still{" "}
        <code>type="email"</code> and <code>type="number"</code>, still
        required, still carrying the schema's bounds. A widget chooses the
        control; the descriptor decides what the control is told.
      </p>
      <p>
        <button type="button" onClick={() => setPlain(!plain)}>
          {plain ? "Put the full table back" : "Drop to the smallest table"}
        </button>
      </p>
      <FormProvider form={form} widgets={registry} showIssues="touched">
        <AutoForm renderList={OrderLines} />
      </FormProvider>
    </section>
  );
}
