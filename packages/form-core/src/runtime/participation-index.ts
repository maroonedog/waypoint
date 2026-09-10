// ===========================================================================
// participation-index.ts — which subtrees still report their verdict.
//
// Presentation and blocking are different axes. A wizard step that is not on
// screen, a section behind a toggle and a field the user has not reached yet
// all still hold values that cross-field rules must read; what they should not
// do is block a submit with an error nobody can see and nobody can focus.
//
// Switching a subtree off is recorded once, at its root, rather than written
// onto every field under it. A path is dormant when itself or any ancestor was
// switched off, so a subtree can be switched off before its fields exist.
// ===========================================================================
import { isAncestorPath } from "../path/path-relation.js";

export interface ParticipationIndex {
  set(path: string, participating: boolean): void;
  isParticipating(path: string): boolean;
  /** The paths explicitly switched off, for a caller that has to write cells. */
  readonly dormantRoots: ReadonlySet<string>;
  /**
   * Re-addresses the switched-off paths after a structural edit. A dormant
   * root is a concrete path held OUTSIDE the store, so renumbering the cells
   * alone would leave it pointing at whichever row moved into that index.
   */
  remap(moved: (path: string) => string | undefined): void;
}

export function createParticipationIndex(): ParticipationIndex {
  const dormant = new Set<string>();

  return {
    set(path, participating) {
      if (participating) dormant.delete(path);
      else dormant.add(path);
    },
    remap(moved) {
      const rewritten = new Set<string>();
      for (const root of dormant) {
        const next = moved(root);
        if (next !== undefined) rewritten.add(next);
      }
      dormant.clear();
      for (const root of rewritten) dormant.add(root);
    },
    isParticipating(path) {
      if (dormant.size === 0) return true;
      for (const root of dormant) {
        if (root === path || isAncestorPath(root, path)) return false;
      }
      return true;
    },
    dormantRoots: dormant,
  };
}
