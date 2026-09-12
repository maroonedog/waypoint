// ===========================================================================
// addressable-paths.ts — which paths this form actually has.
//
// A resolver emits LEAF descriptors only: `items[*].sku`, never `items` or
// `items[*]` or `owner`. But those containers are legitimate things to
// address — an array-level issue lands on `items`, and reading a whole object
// is an ordinary thing to want — so "has a descriptor" is the wrong question
// and asking it produced false warnings on both.
//
// The right one is whether the path is a declared leaf OR an ancestor of one.
// Built once per form from the descriptors the store already holds, because
// the store is what knows the paths; every caller funnels through `field()`
// and inherits the answer rather than each layer keeping its own idea.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import { declaredPathOf } from "../path/declared-path-of.js";

export interface AddressablePaths {
  /** Whether a concrete path names something this form has. */
  has(concretePath: string): boolean;
  /** Declared paths near a miss, for the message. */
  near(concretePath: string): readonly string[];
}

/** `items[*].sku` also puts `items` and `items[*]` in reach. */
const ancestorsOf = (declaredPath: string): readonly string[] => {
  const found: string[] = [];
  for (let at = 0; at < declaredPath.length; at += 1) {
    const here = declaredPath[at];
    if (here === ".") found.push(declaredPath.slice(0, at));
    else if (here === "[" && declaredPath.startsWith("[*]", at)) {
      found.push(declaredPath.slice(0, at));
      found.push(declaredPath.slice(0, at + 3));
    }
  }
  return found;
};

export function createAddressablePaths(
  descriptors: readonly FormFieldDescriptor[]
): AddressablePaths {
  const reachable = new Set<string>();
  for (const descriptor of descriptors) {
    reachable.add(descriptor.path);
    for (const ancestor of ancestorsOf(descriptor.path)) reachable.add(ancestor);
  }

  return {
    has: (concretePath) => reachable.has(declaredPathOf(concretePath)),
    near(concretePath) {
      const wanted = declaredPathOf(concretePath);
      const head = wanted.slice(0, 4);
      return [...reachable]
        .filter((one) => one.startsWith(head) || wanted.startsWith(one.slice(0, 4)))
        .slice(0, 4);
    },
  };
}
