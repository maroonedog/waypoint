// ===========================================================================
// number-from-typing.ts — what a number field's cell holds mid-word.
//
// A number input hands back a string and the schema declared a number, so
// something has to convert, and the naive `Number(raw)` is why the showcase
// used to bypass `inputProps` for numbers entirely: it writes NaN for "-" and
// it writes 1 for "1.", after which the controlled input re-renders as "1",
// the dot the person just typed is gone, and "1.5" cannot be typed at all.
//
// So the rule is round-tripping, not parsing: write the NUMBER only when the
// number spells itself back exactly as it was typed, and otherwise leave the
// text standing. `String(1.5) === "1.5"` so 1.5 is written; `String(1) !==
// "1."` so "1." would stand.
//
// WOULD, because through the markup this library emits it never gets the
// chance, and that is worth knowing before reading the rule as the whole
// story. `type="number"` makes the browser sanitize the element's value: an
// incomplete number is not a value, so "1." and "-" read back as "" and the
// handler is handed "", not the text. Measured in jsdom. Through a number
// input the cell therefore holds `undefined` mid-word rather than a string.
//
// The rule still earns its place twice over. "1e3", "007" and "0.50" DO
// survive sanitization — each is a complete number spelled a way JavaScript
// does not spell back — so they stand as text while the field has focus and
// settle to a number when it loses it, which is the second function here.
// And a caller who spreads these props onto a text box, which is what a masked
// or grouped number field is, gets the full round-tripping behaviour with the
// transient the rule describes. "-" never settles: it is not a number, and
// pretending otherwise would submit a value nobody typed.
// ===========================================================================

/**
 * @returns undefined for an empty box, the number when the text is that
 * number's own spelling, and otherwise the text exactly as typed.
 */
export function numberOrTextWhileTyping(raw: string): number | string | undefined {
  if (raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && String(parsed) === raw ? parsed : raw;
}

/**
 * @returns the number a still-textual cell settles to now that the field has
 * lost focus, or undefined when there is nothing to settle — the cell already
 * holds a number, or holds text that is not a number and has to stand so the
 * validator can say so.
 */
export function numberWhenTypingStops(held: unknown): number | undefined {
  if (typeof held !== "string" || held === "") return undefined;
  const parsed = Number(held);
  return Number.isFinite(parsed) ? parsed : undefined;
}
