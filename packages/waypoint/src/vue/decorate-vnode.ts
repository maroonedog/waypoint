// ===========================================================================
// decorate-vnode.ts — the caller's own element, wired.
//
// THE SAME RULE THE REACT BINDING STATES, because it is a rule about a field
// and not about a framework. Every key the field's bag sets, the field wins —
// except two that compose instead, because for those "winning" is the bug:
//
//   HANDLERS, ours first. Ours writes the cell; the caller's runs after, with
//   the cell already current.
//
//   `aria-describedby`, ours first. Ours reads "what this field wants, then
//   what is wrong with it", and a caller's own text is further help.
//
// Everything the bag does not set is the caller's, untouched — `class`,
// `style`, `placeholder`, `data-*`. This library emits none of them.
//
// WHY IT DOES NOT SIMPLY CALL `cloneVNode(node, bag)`, WHICH IS WHAT IT LOOKS
// LIKE IT SHOULD. `cloneVNode` routes the extra props through `mergeProps`,
// and `mergeProps` chains handlers in the order the CALLER's runs first and
// ours second — the reverse of the rule above, so a caller's handler would
// read the cell before the keystroke reached it. It also replaces
// `aria-describedby` rather than joining. So the props are merged here, by
// hand, and then assigned over the clone's.
//
// The clone is still made WITH the merged props rather than with none, and
// that line is load-bearing. Measured: cloning a vnode with extra props sets
// its patch flag to `FULL_PROPS`, and cloning with none leaves whatever flag
// the original carried. A compiled template's flag says "only these named
// props move", so a clone that kept it would have the props replaced here
// diffed against nothing — silently, and only in a template, which is the
// half of Vue these render functions never exercise.
//
// WHAT IT DOES NOT MERGE, AND WHY THAT IS NOT A GAP HERE. React's version
// merges two `ref`s into one, because the uncontrolled bag carries a
// `RefObject` and a spread would drop one of the two. No bag this entry hands
// out carries a ref — the uncontrolled binding is not part of it — so a ref
// branch would be a branch nothing can reach. A Vue vnode also keeps its ref
// outside `props` entirely, on `vnode.ref`, so the clone carries the caller's
// through untouched.
//
// A NON-ELEMENT IS HANDED BACK UNTOUCHED — a component vnode, a fragment, a
// string, an array, a comment. This is not tidiness: cloning a COMPONENT vnode
// with these props would pass `id`, `onInput` and the rest as component props
// rather than as DOM attributes, which fails silently and in a shape nobody
// would trace back to here. A caller composing markup conditionally reaches
// that case sooner or later, and an unwired field is already reported by the
// coverage check as one nothing drew.
// ===========================================================================
import { cloneVNode, isVNode, type VNode } from "vue";

type AnyProps = Record<string, unknown>;

/** `onInput`, `onBlur`, `onFocus` — an upper-case letter after `on`. */
const isHandler = (key: string): boolean =>
  key.length > 2 && key.startsWith("on") && key.charCodeAt(2) < 91;

/** Vue invokes an array of handlers in order, so ours goes in front. */
const bothHandlers = (ours: unknown, theirs: unknown): readonly unknown[] => [
  ours,
  ...(Array.isArray(theirs) ? (theirs as readonly unknown[]) : [theirs]),
];

export function decorateVNode(node: VNode, bag: Readonly<AnyProps>): VNode {
  if (!isVNode(node) || typeof node.type !== "string") return node;
  const theirs: AnyProps = { ...((node.props ?? {}) as AnyProps) };
  const merged: AnyProps = { ...theirs };

  for (const [key, ours] of Object.entries(bag)) {
    if (ours === undefined) continue;
    const already = theirs[key];
    if (already === undefined) {
      merged[key] = ours;
    } else if (key === "aria-describedby") {
      merged[key] = `${String(ours)} ${String(already)}`;
    } else if (isHandler(key)) {
      merged[key] = bothHandlers(ours, already);
    } else {
      merged[key] = ours;
    }
  }

  const decorated = cloneVNode(node, merged);
  decorated.props = merged;
  return decorated;
}
