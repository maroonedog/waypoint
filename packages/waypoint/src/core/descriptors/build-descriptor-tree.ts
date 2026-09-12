// ===========================================================================
// build-descriptor-tree.ts — the containers, derived from the leaves.
//
// Declaration order is kept. A form drawn in an order nobody chose is a form
// nobody can fill in, and the only order a vendor expressed is the one its
// descriptors arrived in — so a container appears where its first leaf did.
//
// A member that carries both a leaf and children cannot happen: a path is
// either a place a value sits or a place other paths hang from, and a vendor
// that emitted both would have described two different fields with one name.
// The leaf wins, because it is the one somebody can type into.
// ===========================================================================
import type { FormFieldDescriptor } from "../../contract/index.js";
import {
  splitDeclaredPath,
  type DeclaredSegment,
} from "../path/split-declared-path.js";
import type { DescriptorNode } from "./descriptor-tree.types.js";

interface Pending {
  readonly descriptor: FormFieldDescriptor;
  readonly rest: readonly DeclaredSegment[];
}

const joinMember = (prefix: string, name: string): string =>
  prefix === "" ? name : `${prefix}.${name}`;

function buildLevel(
  pending: readonly Pending[],
  prefix: string
): readonly DescriptorNode[] {
  const order: string[] = [];
  const grouped = new Map<string, Pending[]>();
  const leaves = new Map<string, FormFieldDescriptor>();

  for (const entry of pending) {
    const [head, ...rest] = entry.rest;
    if (head === undefined) continue;
    if (head.kind === "each") {
      // A wildcard with no member before it cannot start a level; the member
      // that owns it was consumed by the caller.
      continue;
    }
    if (!grouped.has(head.name)) {
      grouped.set(head.name, []);
      order.push(head.name);
    }
    if (rest.length === 0) leaves.set(head.name, entry.descriptor);
    else grouped.get(head.name)?.push({ descriptor: entry.descriptor, rest });
  }

  const nodes: DescriptorNode[] = [];
  for (const name of order) {
    const path = joinMember(prefix, name);
    const leaf = leaves.get(name);
    if (leaf !== undefined) {
      nodes.push({ kind: "field", path, descriptor: leaf });
      continue;
    }
    const below = grouped.get(name) ?? [];
    const isList = below.some((entry) => entry.rest[0]?.kind === "each");
    if (isList) {
      const inside = below.map((entry) => ({
        descriptor: entry.descriptor,
        rest: entry.rest[0]?.kind === "each" ? entry.rest.slice(1) : entry.rest,
      }));
      nodes.push({
        kind: "list",
        path,
        children: buildLevel(inside, `${path}[*]`),
      });
      continue;
    }
    nodes.push({ kind: "group", path, children: buildLevel(below, path) });
  }
  return nodes;
}

/** The containers and fields of a form, in declaration order. */
export function buildDescriptorTree(
  descriptors: readonly FormFieldDescriptor[]
): readonly DescriptorNode[] {
  return buildLevel(
    descriptors.map((descriptor) => ({
      descriptor,
      rest: splitDeclaredPath(descriptor.path),
    })),
    ""
  );
}
