// ===========================================================================
// find-field-control.ts — the element a path is typed into, found in the
// document rather than derived.
//
// A FILE NO FRAMEWORK OWNS. It is a query against the document, which is the
// one thing every browser binding already shares.
//
// WHY IT IS NOT DERIVED, which is the question this file exists to answer. A
// field's `id` is minted from a scope the binding supplies per call, and
// field-element-ids.ts explains at length why it has to be: a path is unique
// within one form and nothing more, and rendering one path twice — legal here,
// and sometimes the point — would otherwise put two elements in the document
// with the same id and send every `htmlFor` to whichever came first. A summary
// is at neither of those call sites. So it cannot know the id, and this
// package will not hand out an `href="#…"` it has guessed.
//
// What a summary CAN address is `name`, which sharedInputAttributes has always
// set to the concrete path. That is an address the library actually wrote into
// the document, it survives the same path being rendered twice (the first one
// is focused, which is the one a reader reaches first), and it needs no new
// registry, no effect and no bookkeeping in `useField`.
//
// SCOPED BY AN ELEMENT, NOT BY THE DOCUMENT. Two forms on a page both call
// their input `owner.name` — the identical collision the id scheme exists to
// avoid — so the caller puts `scopeProps` on the element that encloses its
// controls and every search starts there. Searching the whole document is the
// fallback when it did not, and it is a fallback rather than the default
// because in that case the wrong form's field is the plausible answer.
//
// The search compares `getAttribute("name")` over `[name]` rather than
// building a `[name="…"]` selector. A path contains dots and brackets and may
// contain a quote, and a selector assembled from a path is a compiled string —
// which is the thing concrete-path.ts already refuses to do for the same
// reason. `querySelectorAll` returns document order, so "the first one" means
// the first a reader would reach.
// ===========================================================================

/** Where to look: the element the controls live inside, or the document. */
export type ControlScope = HTMLElement | Document | null | undefined;

/**
 * Skipped because focusing it does nothing a reader can see. A disabled
 * control refuses focus outright; a hidden input has no rendering to be sent
 * to. Neither is an error — a path can legitimately have both a hidden mirror
 * and a real input, and the real one is what is wanted.
 */
const takesFocus = (element: Element): boolean =>
  !element.hasAttribute("disabled") &&
  element.getAttribute("type") !== "hidden";

/**
 * @returns the first element in document order that carries this path as its
 * `name`, or undefined — for a path with no input at all, which is the case
 * `adoptIssues` exists for and is not a failure.
 */
export function fieldControlAt(
  scope: ControlScope,
  path: string
): HTMLElement | undefined {
  const root =
    scope ?? (typeof document === "undefined" ? undefined : document);
  if (root === undefined) return undefined;
  const named = root.querySelectorAll("[name]");
  for (let at = 0; at < named.length; at += 1) {
    const element = named[at];
    if (element === undefined) continue;
    if (element.getAttribute("name") !== path) continue;
    if (!takesFocus(element)) continue;
    // Duck-typed rather than `instanceof HTMLElement`: an element inside an
    // iframe belongs to that document's constructor and would fail the test
    // while being perfectly focusable.
    if (typeof (element as Partial<HTMLElement>).focus === "function") {
      return element as HTMLElement;
    }
  }
  return undefined;
}

/** @returns whether an element was found and focused. */
export function focusFieldControl(scope: ControlScope, path: string): boolean {
  const element = fieldControlAt(scope, path);
  element?.focus();
  return element !== undefined;
}
