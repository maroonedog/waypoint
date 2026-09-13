// ===========================================================================
// field-coverage.ts — which declared places something took responsibility for.
//
// The descriptors say what the form has. Nothing until now said whether the
// components agreed, and the disagreement is silent in both directions: a path
// nothing declares draws an inert input, and a place nothing draws is a field
// whose value can never be entered. The second is the worse one and it is the
// one that had no report at all — the cell exists, the default is seeded, the
// validator judges it, and a required leaf refuses every submit with a message
// pointing at an input that is not on the screen.
//
// RECORDED ON THE WAY IN AND NEVER RETRACTED. A binding reports itself while
// it renders, not in an effect, because the question is whether anybody WROTE
// a component for this place — not whether one is mounted at this instant. A
// render React discards still answers it, a section behind a toggle answers it
// the moment it is first opened, and a component that unmounts does not
// un-answer it. Counting mounts instead would make the report depend on which
// tab is open, which is a different question nobody asked.
//
// TWO WAYS TO BE MISSING, because "a component asked for this field" and "a
// component drew this field" are not the same claim. A layer-2 field whose
// registry has no widget for its kind asks and then draws nothing, which is
// exactly the shape of the mistake this file exists to catch: everything looks
// wired and the screen is empty. `undrawn` is therefore not a quieter kind of
// `addressed` — it is recorded separately, and `addressed` wins, so a place
// one component fails to draw and another draws is not reported.
//
// EXPANDED AGAINST THE ROOT rather than taken from the descriptors as written.
// A declared path carries `[*]` and a place carries an index, so how many
// places a list has is a fact about the value and only the value knows it. A
// list with no rows has no places and nothing to report, which is correct: the
// row that does not exist needs no input.
//
// A DORMANT SUBTREE IS NOT MISSING. Saying `setParticipating(path, false)` is
// how an application says a part of the form is deliberately not in play here,
// and a subtree that does not block a submit is not one whose absence from the
// screen is a defect.
// ===========================================================================
import type { FormFieldDescriptor } from "../../contract/index.js";
import { expandDeclaredPath } from "../path/expand-declared-path.js";

/** Why one declared place is not accounted for. */
export type MissingFieldReason = "unaddressed" | "undrawn";

export interface MissingField {
  /** The place, with row indices in it — what a caller would address. */
  readonly path: string;
  /** The rule it came from, which is what a descriptor is keyed by. */
  readonly declaredPath: string;
  /** The descriptor's own label, when it declared one. */
  readonly label: string | undefined;
  /**
   * `"unaddressed"` — nothing asked for this place at all.
   * `"undrawn"` — something asked for it and had nothing to draw it with.
   */
  readonly reason: MissingFieldReason;
}

export interface FieldCoverage {
  /** A component took this place and put it on the screen. */
  addressed(path: string): void;
  /** A component took this place and drew nothing. */
  undrawn(path: string): void;
  /** Declared places nothing accounted for, in declaration order. */
  missing(): readonly MissingField[];
}

export interface FieldCoverageRequest {
  readonly descriptors: readonly FormFieldDescriptor[];
  readonly readRoot: () => unknown;
  readonly isParticipating: (path: string) => boolean;
}

export function createFieldCoverage(
  request: FieldCoverageRequest
): FieldCoverage {
  const { descriptors, readRoot, isParticipating } = request;
  const drawn = new Set<string>();
  const blank = new Set<string>();

  return {
    addressed(path) {
      drawn.add(path);
      blank.delete(path);
    },
    undrawn(path) {
      if (!drawn.has(path)) blank.add(path);
    },
    missing() {
      const root = readRoot();
      const found: MissingField[] = [];
      for (const descriptor of descriptors) {
        for (const path of expandDeclaredPath(root, descriptor.path)) {
          if (drawn.has(path)) continue;
          if (!isParticipating(path)) continue;
          found.push({
            path,
            declaredPath: descriptor.path,
            label: descriptor.label,
            reason: blank.has(path) ? "undrawn" : "unaddressed",
          });
        }
      }
      return found;
    },
  };
}
