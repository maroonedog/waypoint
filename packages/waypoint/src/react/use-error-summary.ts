// ===========================================================================
// use-error-summary.ts — what an error summary needs, and no summary.
//
// THE PATTERN. A form that is refused on submit has to tell somebody who is
// not looking at the screen what went wrong and where. The two accepted
// answers are to move focus to the first field in error, or to render a list
// at the top of the form whose entries take a reader to their fields — the
// GOV.UK error summary, which is the one an auditor asks for by name. This
// hook is for either, and doing both is the arrangement GOV.UK ships: a
// summary that is focused, whose entries move focus onward.
//
// WHAT IT HANDS BACK IS DATA, NOT MARKUP, for the reason layer 1 gives about
// widgets. A summary carries a heading, its wording, its language, its place
// in the reading order and its styling, and every one of those is a decision
// the application has to make and this package cannot. So: ordered entries,
// each with the label its schema declared, the message, and a way to reach the
// field — plus two prop bags, which is the shape `useField` already hands back.
//
// THE ORDER IS THE FEATURE, and it is computed in `./core` by
// `summarizeIssues`, whose header argues it at length. Short version:
// declaration order, interleaved through row indices, never issue order.
//
// WHAT IT LISTS is `form.blockedBy` — the same list `errorCount` is the length
// of. That deliberately includes an issue on a path no descriptor declares and
// no component draws, which is what `adoptIssues` produces and is exactly the
// issue a reader can otherwise never find: "the card was declined" belongs in
// the summary precisely because there is no field to put it beside.
//
// WHY THERE IS NO `href`. GOV.UK's entries are `<a href="#input-id">`, and
// this hook hands back `focus()` instead. The id is not available: it is
// minted by `useId()` inside the `useField` CALL, deliberately, so that
// rendering one path twice cannot put two elements with one id in the document
// — field-element-ids.ts makes that argument and it still holds. A summary is
// at neither call site. Guessing an id that no element carries would produce a
// link that silently goes nowhere, which is worse than a button that works, so
// the entries are meant to be rendered as buttons. A caller that wants real
// links has the ids at its own field call sites and can thread them itself;
// this package will not invent them. Nothing here has been in front of a
// screen reader, and a button-that-focuses versus a link-that-navigates is a
// difference a screen reader user would feel — that is a stated gap.
//
// THE PASS THAT JUDGED IS NOT THE RENDER THAT SHOWS THE SUMMARY, and
// `focusFirst` is written for the gap between them. The natural way to use it
// is `if (!(await form.submit(h)).submitted) summary.focusFirst()`, and that
// line runs before React has re-rendered — so a `focusFirst` closed over this
// render's entries would send a reader to the PREVIOUS verdict's first field,
// or nowhere at all on the first failed submit. It re-reads the source
// instead, which is current the moment the pass commits.
// ===========================================================================
import { useCallback, useMemo, useRef } from "react";
import type { FieldIssueSummary } from "../core/index.js";
import { summarizeIssues } from "../core/index.js";
import { fieldControlAt, focusFieldControl } from "./find-field-control.js";
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type { FormKey } from "./form-type-registry.js";

/** One row of a summary: what to say, and how to get there. */
export interface ErrorSummaryEntry extends FieldIssueSummary {
  /**
   * Moves focus to this field's control, and reports whether it found one.
   * False is the honest answer for an issue on a path nothing draws — an
   * adopted "the card was declined" is exactly that.
   *
   * The answer arrives when it is CALLED, and there is no earlier one to
   * render against: whether a control exists is a fact about the DOM at that
   * instant, and asking during render would make the snapshot differ on every
   * call, which is the loop `useSyncExternalStore` reports as an uncached
   * getSnapshot. So a caller renders every row the same way and lets the click
   * come back false. The row still reads; there is simply nowhere to send
   * anybody.
   */
  focus(): boolean;
}

/** Goes on the element the controls live inside — usually the `<form>`. */
export interface ErrorSummaryScopeProps {
  readonly ref: (element: HTMLElement | null) => void;
}

/**
 * Goes on the summary region. `tabIndex: -1` is what makes it focusable by
 * script without putting it in the tab order.
 *
 * `role="alert"` is NOT emitted, and the omission is deliberate. GOV.UK
 * announces the summary as a live region AND moves focus into it; doing both
 * from a library would announce twice for a caller who then focuses it, and a
 * live region is the wrong mechanism for a summary that is mounted at the same
 * moment as its first message — the caveat errorPropsFor already states about
 * `role="alert"` on a message line applies here with more force, because a
 * summary is usually not in the document at all until a submit is refused. A
 * caller that renders the summary always and lets it be empty can add the role
 * and skip the focus; a caller that mounts it on failure should focus it.
 */
export interface ErrorSummaryRegionProps {
  readonly ref: (element: HTMLElement | null) => void;
  readonly tabIndex: -1;
}

export interface ErrorSummary {
  /** In the order a reader meets the fields. Empty when nothing blocks. */
  readonly entries: readonly ErrorSummaryEntry[];
  readonly scopeProps: ErrorSummaryScopeProps;
  readonly summaryProps: ErrorSummaryRegionProps;
  /** Focuses the first field in error. @returns whether one was found. */
  focusFirst(): boolean;
  /** Focuses the summary region. @returns whether it is in the document. */
  focusSummary(): boolean;
}

/**
 * A KEY AND NOT A PATH, which is why qualifying paths does nothing for this
 * hook. A summary is an aggregate over one whole form, so there is no path in
 * the call for a form's name to ride in on. What it took was an unchecked
 * string; what it takes now is a registered key, checked against the enclosing
 * provider's like every other named call.
 *
 * The entries' own paths stay UNQUALIFIED. They come from the descriptor tree
 * and they are handed to `fieldControlAt`, which matches them against the DOM
 * `name` attribute — so they belong to the same vocabulary the inputs carry,
 * and qualifying them here would only stop them matching.
 */
export function useErrorSummary(formKey?: FormKey): ErrorSummary {
  const form = useFormHandle(formKey);
  const blocking = useCell(form.blockedBy);

  const scope = useRef<HTMLElement | null>(null);
  const region = useRef<HTMLElement | null>(null);
  const setScope = useCallback((element: HTMLElement | null) => {
    scope.current = element;
  }, []);
  const setRegion = useCallback((element: HTMLElement | null) => {
    region.current = element;
  }, []);

  const entries = useMemo(
    () =>
      summarizeIssues({ tree: form.tree, issues: blocking }).map(
        (summary): ErrorSummaryEntry => ({
          ...summary,
          focus: () => focusFieldControl(scope.current, summary.path),
        })
      ),
    [form, blocking]
  );

  const focusFirst = useCallback((): boolean => {
    // Re-read rather than close over `entries`. Calling this straight after
    // `await form.submit(...)` happens BEFORE React has re-rendered, so the
    // closed-over list would be the previous verdict's; the source is current
    // the moment the pass commits.
    const now = summarizeIssues({
      tree: form.tree,
      issues: form.blockedBy.read(),
    });
    for (const entry of now) {
      // Not simply `now[0]`: the first field in error may be one nothing
      // draws — an adopted issue on `payment` — and stopping there would leave
      // focus where it was with no explanation. Going on to the next one that
      // IS drawn puts the reader at the first thing they can act on.
      if (fieldControlAt(scope.current, entry.path) !== undefined) {
        return focusFieldControl(scope.current, entry.path);
      }
    }
    return false;
  }, [form]);

  const focusSummary = useCallback((): boolean => {
    region.current?.focus();
    return region.current !== null;
  }, []);

  return {
    entries,
    scopeProps: { ref: setScope },
    summaryProps: { ref: setRegion, tabIndex: -1 },
    focusFirst,
    focusSummary,
  };
}
