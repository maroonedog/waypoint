// ===========================================================================
// shared-skeleton.ts — the tree every subject is rendered into.
//
// One form element, one leaf per declared path, in descriptor order. A subject
// supplies the component that draws one leaf; it does not decide how many
// there are, what order they come in, or what wraps them.
//
// A subject whose idiom requires a component boundary of its own renders more
// fibers than one that does not. That is not hidden: such a subject is
// declared `own-tree` and its fiber count is never printed beside an
// `equal-tree` subject without the difference on the same row.
// ===========================================================================
import { createElement as h, type ComponentType, type ReactElement } from "react";
import { concretePaths } from "./declared-paths.ts";

export interface LeafProps {
  readonly path: string;
  readonly label: string;
}

export function SharedSkeleton({
  Leaf,
  paths = concretePaths,
}: {
  readonly Leaf: ComponentType<LeafProps>;
  /**
   * Rendered with NO paths to measure what a subject wiring costs on its own.
   * Measuring that is better than letting a subject declare it: a declared
   * overhead is a number the author chooses, and this one is taken.
   */
  readonly paths?: readonly string[];
}): ReactElement {
  return h(
    "form",
    { "data-skeleton": "order", onSubmit: (event: Event) => event.preventDefault() },
    paths.map((path) => h(Leaf, { key: path, path, label: path }))
  );
}
