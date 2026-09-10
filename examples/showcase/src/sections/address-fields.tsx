import type { ReactElement } from "react";
import { Field } from "form-react";
import { MdTextField } from "../md/text-field.js";
import { MdSelectField } from "../md/select-field.js";

/**
 * One address, written against LOCAL names. It is placed twice — once under
 * `billing`, once under `shipping` — and nothing in it knows which. The
 * enclosing FieldScope is what binds it.
 */
export function AddressFields(): ReactElement {
  return (
    <>
      <Field path="postcode">
        {(field) => (
          <MdTextField
            field={field}
            label="郵便番号"
            hint="例: 100-0001"
            leading="markunread_mailbox"
          />
        )}
      </Field>
      <Field path="prefecture">
        {(field) => <MdSelectField field={field} label="都道府県" />}
      </Field>
      <div className="sm:col-span-2">
        <Field path="city">
          {(field) => (
            <MdTextField field={field} label="市区町村" leading="location_city" />
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="street">
          {(field) => <MdTextField field={field} label="番地" />}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field path="building">
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
