// ===========================================================================
// zod-definition-to-kind.ts — which widget family a zod type belongs to.
//
// A type this does not know maps to `unknown` rather than throwing. A schema
// is allowed to contain shapes no renderer has a widget for, and refusing the
// whole form because one field is exotic would make the resolver useless on
// any real schema.
// ===========================================================================
import type { FormFieldKind } from "form-contract";

const KIND_OF_ZOD_TYPE: Readonly<Record<string, FormFieldKind>> = Object.freeze(
  {
    string: "string",
    number: "number",
    bigint: "number",
    boolean: "boolean",
    date: "date",
    array: "array",
    object: "object",
    enum: "string",
    literal: "string",
  }
);

/** The widget family for a zod type name. */
export function zodDefinitionToKind(type: string): FormFieldKind {
  return KIND_OF_ZOD_TYPE[type] ?? "unknown";
}
