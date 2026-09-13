// ===========================================================================
// describe-missing-fields.ts — the sentence a hole in a form deserves.
//
// THE PROVIDER IS THE MOMENT, NOT THE SCOPE, and the first line says so. The
// ledger belongs to the form, so a form drawn across two providers is asked
// twice about the same places and the earlier one is asked before the later
// one's subtree exists. Naming the provider as the scope would be the easy
// sentence and the wrong one; naming it as the clock is both short and true,
// and it also tells the reader which mount to look at.
//
// WHY IT IS A DEFECT AT ALL is the part the reader does not already know, so
// it is in the message rather than in a document nobody opens. A declared
// place with nothing on the screen is not an omission from the UI — the cell
// exists, the default was seeded, the validator judges it, and if it is
// required it refuses every submit while the error summary points at an input
// that is not there. The reader is looking for a bug in the submit button.
//
// THE TWO REASONS READ DIFFERENTLY and are therefore listed apart. "Nothing
// asked for it" is a missing component. "Nothing drew it" is a component that
// asked and came back empty-handed, which is a widget registry with no entry
// for that kind — a different fix, in a different file, and the two were worth
// separating for that reason alone.
//
// QUOTED THE WAY THE READER WOULD TYPE IT. A path is pasted back into source,
// so the form's name goes in front of it wherever the provider has one.
//
// The remedies are named in the order they are likely: draw it; or say this
// screen is partial; or say the subtree is not in play at all.
// ===========================================================================
import type { MissingField } from "../core/index.js";

const quoted = (field: MissingField, formKey: string | undefined): string => {
  const spelling =
    formKey === undefined ? field.path : `${formKey}:${field.path}`;
  return field.label === undefined
    ? `"${spelling}"`
    : `"${spelling}" (${field.label})`;
};

const line = (
  heading: string,
  fields: readonly MissingField[],
  formKey: string | undefined
): string =>
  fields.length === 0
    ? ""
    : `\n  ${heading}: ${fields.map((one) => quoted(one, formKey)).join(", ")}`;

export function describeMissingFields(
  missing: readonly MissingField[],
  formKey: string | undefined
): string {
  const unaddressed = missing.filter((one) => one.reason === "unaddressed");
  const undrawn = missing.filter((one) => one.reason === "undrawn");
  return (
    `[waypoint] ${missing.length} declared field(s) nothing has drawn ` +
    "(checked when this <FormProvider> finished mounting)." +
    line("nothing asked for", unaddressed, formKey) +
    line("asked for, no widget", undrawn, formKey) +
    "\n  Each still holds a value and is still judged, so a required one " +
    "refuses every submit naming a control nobody can see. Draw them, pass " +
    "`partial` if this screen draws part of the form, or setParticipating" +
    "(path, false) if the subtree is not in play."
  );
}
