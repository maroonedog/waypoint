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
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import { readValueAt } from "../path/read-value-at.js";
import { writeValueAt } from "../path/write-value-at.js";

const hasWildcard = (path: string): boolean => path.includes("[*]");

export function seedRootValue(
  descriptors: readonly FormFieldDescriptor[],
  defaultValues: unknown
): unknown {
  let root: unknown = defaultValues === undefined ? {} : defaultValues;
  for (const descriptor of descriptors) {
    if (hasWildcard(descriptor.path)) continue;
    if (readValueAt(root, descriptor.path) !== undefined) continue;
    root = writeValueAt(root, descriptor.path, undefined);
  }
  return root;
}
