// ===========================================================================
// seed-root-value.ts — the complete root, before anything mounts.
//
// This is the policy that makes a field in a separate, lazily mounted or
// portaled component stop being a case. Every declared path exists in the root
// from the moment the form is created, so a cross-field rule reading a sibling
// gets the real value whether or not any component has ever rendered it, and
// mounting becomes a subscription rather than a registration.
//
// A path absent from the defaults is materialised as undefined rather than as
// a type-appropriate blank. Undefined is what "nobody has filled this in"
// means, and inventing "" would make a required string field pass a presence
// check it should fail.
//
// An array container is the exception: it is materialised as an empty list.
// A missing array and an array with no rows read the same to a renderer, and
// only one of them lets a row be inserted without the root growing a branch
// first.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import { readValueAt } from "../path/read-value-at.js";
import { writeValueAt } from "../path/write-value-at.js";

const hasWildcard = (path: string): boolean => path.includes("[*]");

const arrayPathsIn = (declaredPath: string): readonly string[] => {
  const found: string[] = [];
  let at = declaredPath.indexOf("[*]");
  while (at !== -1) {
    found.push(declaredPath.slice(0, at));
    at = declaredPath.indexOf("[*]", at + 3);
  }
  return found;
};

export function seedRootValue(
  descriptors: readonly FormFieldDescriptor[],
  defaultValues: unknown
): unknown {
  let root: unknown = defaultValues === undefined ? {} : defaultValues;

  // Outermost array first, so the shorter path exists before a longer one
  // tries to descend through it.
  const arrayPaths = new Set<string>();
  for (const descriptor of descriptors) {
    for (const arrayPath of arrayPathsIn(descriptor.path)) {
      arrayPaths.add(arrayPath);
    }
  }
  for (const arrayPath of Array.from(arrayPaths).sort(
    (one, other) => one.length - other.length
  )) {
    if (!hasWildcard(arrayPath) && !Array.isArray(readValueAt(root, arrayPath))) {
      root = writeValueAt(root, arrayPath, []);
    }
  }

  for (const descriptor of descriptors) {
    if (hasWildcard(descriptor.path)) continue;
    if (readValueAt(root, descriptor.path) !== undefined) continue;
    root = writeValueAt(root, descriptor.path, undefined);
  }
  return root;
}
