// ===========================================================================
// form-message.ts — the application's wording, over the validator's.
//
// THE LIBRARY OWNS NO MESSAGE AND STILL DOES NOT. What it owns is the point at
// which one can be substituted, and the material to build one from: an issue
// carries `path`, `message`, and — from a vendor resolver — `code`; the
// descriptor carries `kind`, `isRequired`, `label` and the declared bounds. So
// a caller writes the sentence and interpolates the bound from the descriptor
// rather than parsing it back out of the vendor's English.
//
// `code` IS THE KEY, AND IT IS VENDOR-ONLY. `StandardSchemaV1.Issue` has two
// members and `code` is not one of them, so `standardFormResolver` carries
// none — measured: the same failing root gives `code: "too_small"` through
// `zodFormResolver` and no code at all through the generic path. A translation
// table keyed on the message STRING is a table that breaks when the vendor
// rewords, so an application that wants its own wording wants a vendor
// resolver, and that is a fact about the spec rather than a preference.
//
// UNDEFINED KEEPS WHAT THE VALIDATOR SAID, which is the default that makes a
// partial table safe. A lookup that misses returns undefined, and a missing
// translation must leave a real message standing rather than blanking the
// error — an empty `role="alert"` announces nothing and looks like a field
// with no problem.
//
// IT IS NOT `showIssues`, and the line between them is worth stating because
// they arrive by the same route. Visibility is per CONTROL — is this input
// ready to complain to the person typing in it — so it is applied in the
// bindings and `useFieldIssues` does not pass through it. Wording is per
// APPLICATION: two wordings for one issue on one screen is the defect, so
// every hook that hands out a message applies this one, the summary included.
//
// IDENTITY IS PRESERVED WHEN NOTHING CHANGES. The mapped list is returned only
// if some message actually moved; otherwise the original array comes back, so
// the interned empty list stays interned and a caller watching `issues` in a
// dependency array is not woken by a rewording that did not happen. An
// application with no function set pays one `undefined` check.
// ===========================================================================
import type { FormFieldDescriptor, FormIssue } from "../contract/index.js";

/**
 * @returns the sentence to show, or undefined to keep the validator's.
 *
 * `descriptor` is undefined for a path no descriptor declares — an issue a
 * server adopted onto `payment`, for one — which is exactly when there are no
 * bounds to interpolate and the validator's own text is all there is.
 */
export type FormMessageFor<TCode extends string = string> = (
  issue: FormIssue<TCode>,
  descriptor: FormFieldDescriptor | undefined
) => string | undefined;

/**
 * THE WIDEST SHAPE, AND THE ONE CAST THIS DESIGN NEEDS. A function declared for
 * one form's codes does not accept an issue typed with every code — a
 * parameter is contravariant, and that refusal is correct in general. It is
 * not correct HERE, and the reason is the one thing the types cannot see: the
 * function was declared against the form whose issues it is being applied to.
 * So each place that hands one in widens it, once, beside that sentence, and
 * nothing below this line pretends to know a code.
 */
export type AnyFormMessageFor = FormMessageFor<string>;

export function wordedIssues(
  issues: readonly FormIssue[],
  messageFor: AnyFormMessageFor | undefined,
  descriptor: FormFieldDescriptor | undefined
): readonly FormIssue[] {
  if (messageFor === undefined || issues.length === 0) return issues;
  let moved = false;
  const next = issues.map((issue) => {
    const text = messageFor(issue, descriptor);
    if (text === undefined || text === issue.message) return issue;
    moved = true;
    return { ...issue, message: text };
  });
  return moved ? next : issues;
}
