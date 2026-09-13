import type { ReactElement } from "react";
import { Field, type FormPathOver } from "@maroonedog/waypoint/react";
import { MdTextField } from "../md/text-field.js";
import { MdSelectField } from "../md/select-field.js";

/**
 * One address, placed twice — once under `billing`, once under `shipping`.
 * It is told WHERE by a prop, and that prop is the only thing it is told: no
 * value, no setter, no change handler. An address does not move when a value
 * does, so passing it re-renders nobody and there is nothing above to lift.
 *
 * The prop's type is the set of places this whole section fits, computed from
 * the registered form — so the paths it builds by interpolation stay checked,
 * and a place that is missing one of these five fields will not compile.
 *
 * Each of those places names its form: `form:billing`, `form:shipping`. That
 * is what makes ONE prop enough — the section belongs to the design system
 * rather than to a form, and a path that carries its own form is a whole
 * instruction rather than half of one.
 *
 * It is not a compile-time guarantee that the form is THIS screen's.
 * `FormPathOver` defaults to every registered key, so a second screen's place
 * still satisfies this prop; what the prefix buys is that the provider can
 * compare the name at run time instead of drawing blank inputs in silence.
 */
export function AddressFields({
  at,
}: {
  readonly at: FormPathOver<
    "postcode" | "prefecture" | "city" | "street" | "building"
  >;
}): ReactElement {
  return (
    <>
      <Field path={`${at}.postcode`}>
        {(field) => (
          <MdTextField
            field={field}
            label="郵便番号"
            hint="例: 100-0001"
            leading="markunread_mailbox"
          />
        )}
      </Field>
      <Field path={`${at}.prefecture`}>
        {(field) => <MdSelectField field={field} label="都道府県" />}
      </Field>
      <div className="sm:col-span-2">
        <Field path={`${at}.city`}>
          {(field) => (
            <MdTextField field={field} label="市区町村" leading="location_city" />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path={`${at}.street`}>
          {(field) => <MdTextField field={field} label="番地" />}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path={`${at}.building`}>
          {(field) => (
            <MdTextField
              field={field}
              label="建物名・部屋番号"
              hint="任意"
            />
          )}
        </Field>
      </div>
    </>
  );
}
