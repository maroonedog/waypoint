// ===========================================================================
// shared-fields.tsx — the design system's inputs, which belong to no form.
//
// THIS FILE IMPORTS NOTHING FROM EITHER FORM. No schema, no adapter, no handle
// and no `waypoint-forms.js`. It is the file a design system would publish as
// its own package, and the reason the example exists: both screens below use
// the same two components, and neither component knows which of the two forms
// it is inside.
//
// ONE PROP, AND IT IS AN ADDRESS. `FormPathTo<string>` is every registered
// place whose value is a string — across every registered form — so
// `customer:owner.email` and `admin:owner.email` both satisfy it and neither
// has to pass a handle, a control, a name or a type parameter alongside.
// `FormPathTo<number>` is the same question asked about numbers, which is why
// `Num` cannot be handed an email by accident.
//
// WHAT IT DOES NOT PROMISE, stated because it is easy to assume otherwise: the
// type does not say the path belongs to the form this component is rendered
// under. Two screens' places both satisfy the prop. What the prefix buys is
// that the provider compares the name at RUN time and throws, instead of
// drawing an input that silently belongs to nobody.
// ===========================================================================
import type { ReactElement } from "react";
import { useField, type FormPathTo } from "@maroonedog/waypoint/react";

export function Text({
  at,
  label,
}: {
  readonly at: FormPathTo<string>;
  readonly label: string;
}): ReactElement {
  const field = useField(at);
  return (
    <label className="field">
      <span>{label}</span>
      <input {...field.inputProps} />
      <span className="hint mono">{field.path}</span>
      <span className="msg" {...field.errorProps}>
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}

export function Num({
  at,
  label,
}: {
  readonly at: FormPathTo<number>;
  readonly label: string;
}): ReactElement {
  const field = useField(at);
  return (
    <label className="field">
      <span>{label}</span>
      <input {...field.inputProps} />
      <span className="hint mono">{field.path}</span>
      <span className="msg" {...field.errorProps}>
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}
