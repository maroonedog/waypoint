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
}

export function createParticipationIndex(): ParticipationIndex {
  const dormant = new Set<string>();

  return {
    set(path, participating) {
      if (participating) dormant.delete(path);
      else dormant.add(path);
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
