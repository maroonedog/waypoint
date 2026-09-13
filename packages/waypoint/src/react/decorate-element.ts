// ===========================================================================
// decorate-element.ts — the caller's own element, wired.
//
// THE ESCAPE HATCH FROM THE ESCAPE HATCH. Layer 3 hands out four prop bags and
// says "spread what you want", which is right until the caller's element
// already has props of its own. Then spreading is a merge the caller has to
// perform, and the two halves of it that matter are exactly the two that look
// like they do not: a spread drops the caller's `onChange` if ours comes
// second and drops OURS if it comes first, and `aria-describedby` is a
// space-separated list where whichever side loses simply stops being
// announced. Both failures are silent, and neither is visible in the DOM.
//
// THE RULE IS ONE SENTENCE. Every key the field's bag sets, the field wins —
// except three that compose instead, because for those "winning" is the bug:
//
//   HANDLERS, ours first. Ours writes the cell; the caller's runs after, with
//   the cell already current, which is the order a caller who wants to read
//   the new value expects. A caller's handler that throws does not prevent
//   the write, because the write already happened.
//
//   `aria-describedby`, ours first. Ours reads "what this field wants, then
//   what is wrong with it", and a caller's own text is further help rather
//   than a correction.
//
//   `ref`, both assigned. This is why the merge cannot be `cloneElement` with
//   a spread at all: the uncontrolled bag carries a `RefObject` and an element
//   that already has a ref would lose one of the two.
//
// EVERYTHING THE BAG DOES NOT SET IS THE CALLER'S, untouched — `className`,
// `style`, `placeholder`, `data-*`, `autoComplete`. This library emits none of
// them and has no opinion about any of them.
//
// An earlier draft carried a list of keys "the field owns outright" as though
// that were a separate rule. It was unreachable: every key not composed
// already resolved to the field's value, so the list decided nothing and
// described a policy the code did not have. What is left is what was always
// running.
// ===========================================================================
import { cloneElement, isValidElement, type ReactElement, type Ref } from "react";

type AnyProps = Record<string, unknown>;

/** `onChange`, `onBlur`, `onFocus` — an upper-case letter after `on`. */
const isHandler = (key: string): boolean =>
  key.length > 2 && key.startsWith("on") && key.charCodeAt(2) < 91;

const callBoth =
  (ours: unknown, theirs: unknown) =>
  (...args: readonly unknown[]): void => {
    if (typeof ours === "function") (ours as (...a: unknown[]) => void)(...args);
    if (typeof theirs === "function")
      (theirs as (...a: unknown[]) => void)(...args);
  };

/** Assigns to both, whichever of the two ref shapes each of them is. */
const assignBoth =
  (ours: unknown, theirs: unknown) =>
  (node: unknown): void => {
    for (const one of [ours, theirs]) {
      if (typeof one === "function") (one as (n: unknown) => void)(node);
      else if (one !== null && typeof one === "object")
        (one as { current: unknown }).current = node;
    }
  };

/**
 * @returns the element with this field's props merged into its own.
 *
 * A non-element — a string, `null`, an array — is handed back untouched rather
 * than thrown over. A caller composing markup conditionally passes one of
 * those sooner or later, and an unwired field is already reported by the
 * coverage check as one nothing drew.
 */
export function decorateElement(
  element: ReactElement,
  bag: Readonly<AnyProps>
): ReactElement {
  if (!isValidElement(element)) return element;
  const theirs = (element.props ?? {}) as AnyProps;
  const merged: AnyProps = { ...theirs };

  for (const [key, ours] of Object.entries(bag)) {
    if (ours === undefined) continue;
    const already = theirs[key];
    if (already === undefined) {
      merged[key] = ours;
    } else if (key === "aria-describedby") {
      merged[key] = `${String(ours)} ${String(already)}`;
    } else if (key === "ref") {
      merged[key] = assignBoth(ours, already) as unknown as Ref<unknown>;
    } else if (isHandler(key)) {
      merged[key] = callBoth(ours, already);
    } else {
      merged[key] = ours;
    }
  }

  return cloneElement(element, merged);
}
