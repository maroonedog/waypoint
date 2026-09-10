// ===========================================================================
// descriptor-index.ts — a descriptor for a live field.
//
// Descriptors are keyed by declared path and a field arrives holding a
// concrete one, so the index converts before it looks up. Doing it here rather
// than at each call site means one place decides what "the same field" means.
//
// It also answers what a row is made of: the declared paths that live under an
// array are what a splice has to renumber, and they are already here.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import { declaredPathOf } from "../path/declared-path-of.js";

export interface DescriptorIndex {
  /** The descriptor for a concrete path, or undefined when none was declared. */
  at(concretePath: string): FormFieldDescriptor | undefined;
  /** Every declared path that lies under `arrayPath[*]`, including deeper ones. */
  membersOf(arrayPath: string): readonly string[];
  /** Every declared path that names an array, outermost first. */
  readonly arrayPaths: readonly string[];
}

const arrayPathsIn = (declaredPath: string): readonly string[] => {
  const found: string[] = [];
  let at = declaredPath.indexOf("[*]");
  while (at !== -1) {
    found.push(declaredPath.slice(0, at));
    at = declaredPath.indexOf("[*]", at + 3);
  }
  return found;
};

export function createDescriptorIndex(
  descriptors: readonly FormFieldDescriptor[]
): DescriptorIndex {
  const byDeclared = new Map<string, FormFieldDescriptor>();
  const arrays = new Set<string>();
  for (const descriptor of descriptors) {
    byDeclared.set(descriptor.path, descriptor);
    for (const arrayPath of arrayPathsIn(descriptor.path)) arrays.add(arrayPath);
  }
  const arrayPaths = Array.from(arrays).sort(
    (one, other) => one.length - other.length
  );

  return {
    at: (concretePath) => byDeclared.get(declaredPathOf(concretePath)),
    membersOf: (arrayPath) => {
      const under = `${arrayPath}[*]`;
      return Array.from(byDeclared.keys()).filter((declared) =>
        declared.startsWith(under)
      );
    },
    arrayPaths,
  };
}
