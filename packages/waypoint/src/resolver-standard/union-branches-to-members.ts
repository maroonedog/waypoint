// ===========================================================================
// union-branches-to-members.ts — a `oneOf`/`anyOf` read as the fields a form
// would draw for it.
//
// A union arrived here as nothing at all. The walk next door has two container
// branches, `object` with `properties` and `array` with `items`, and a union
// node has neither — no `type`, no `properties` — so it fell through to the
// leaf case and became one descriptor of kind "unknown" with no members. That
// is not a dead field: the VALUE at `who.a` reads and writes correctly, so a
// hand-drawn input works. What is missing is the description, so
// `resolveWidget` finds no kind, no format and no choices and falls through to
// the registry's fallback — which for a partial registry draws nothing.
//
// It is also the one place the two halves of the package DISAGREED about a
// shape rather than merely being quiet about it: `FieldPath` distributes
// `MemberPaths` over a union, so `who.a | who.b | disc.kind` are already
// typed paths, and the resolver described none of them. Deriving is therefore
// closing a gap rather than inventing a capability.
//
// THREE READINGS, and which one applies is decided by the branches alone:
//
//   members  every branch is an object with properties — the form draws the
//            union of their keys, flat, at the same prefix, which is exactly
//            what `FieldPath` already offers.
//   closed   every branch is a `const` or an `enum` — one field with the
//            branches' values as its choices. `z.union([z.literal("a"),
//            z.literal("b")])` is this, and so is a discriminant.
//   opaque   anything else, including a union that mixes an object with a
//            scalar. Read here on zod 4.6.4, `z.union([z.string(),
//            z.object({…})])` is the mixed case, and there is no one field a
//            renderer could draw for it — so it stays the single "unknown"
//            leaf it is today rather than being half-described.
//
// A DISCRIMINANT IS NOT RECOGNISED BY NAME. It is the key every branch
// declares and every branch closes, which is a fact about the document rather
// than a word this package knows; the vendor's own `discriminator` keyword is
// not read, because deriving the same answer from the branches works for a
// plain union of literals too. Its choices are the branches' values MERGED —
// taking one branch's `const` alone would render a select holding one option,
// which is worse than rendering none.
//
// WHAT IS LOST, stated because a descriptor cannot carry it: a member declared
// by only some branches comes back `isRequired: false` whatever its own branch
// says. "Required only when kind is 'a'" is a rule about a sibling's value and
// a descriptor has no room for one. The validator still enforces it, so the
// submit is refused correctly; only the asterisk beside the label is missing.
// Two branches declaring the SAME key with different types collapse to one
// descriptor, and the FIRST branch's spelling wins — first rather than
// "merged", so the answer does not depend on the order a vendor happens to
// emit its keys in beyond that one rule.
// ===========================================================================
import type { JsonSchemaNode } from "./json-schema-to-descriptors.js";

/** One member a union contributes, and whether every branch demands it. */
export interface UnionMember {
  readonly key: string;
  readonly node: JsonSchemaNode;
  readonly isRequired: boolean;
}

/** Which of the three readings the branches admit. */
export type UnionReading =
  /** Every branch is an object: the flat union of their keys. */
  | { readonly shape: "members"; readonly members: readonly UnionMember[] }
  /** Every branch is a literal: one field, with all of them as choices. */
  | { readonly shape: "closed"; readonly node: JsonSchemaNode }
  /** Nothing a renderer could draw from the branches. */
  | { readonly shape: "opaque" };

const OPAQUE: UnionReading = { shape: "opaque" };

/**
 * The values a node closes over, or none when it closes over nothing.
 *
 * `null` is a value a `const` may legitimately hold, so absence is tested as
 * `undefined` and nothing shorter.
 */
const closedValuesOf = (node: JsonSchemaNode): readonly unknown[] | undefined => {
  if (node.enum !== undefined) return node.enum;
  return node.const === undefined ? undefined : [node.const];
};

/** One node standing for all the branches, carrying every value they allow. */
const mergedClosedNode = (
  branches: readonly JsonSchemaNode[]
): JsonSchemaNode | undefined => {
  const values: unknown[] = [];
  for (const branch of branches) {
    const closed = closedValuesOf(branch);
    if (closed === undefined) return undefined;
    for (const value of closed) {
      if (!values.includes(value)) values.push(value);
    }
  }
  // The first branch supplies `type`, `title` and the rest; only the allowed
  // values are rebuilt. `const` is dropped in favour of `enum` because one
  // field now allows several values, and a `const` beside them would say the
  // opposite. `format` and the bounds are deliberately left as the first
  // branch wrote them: a union of literals shares them or the document is
  // already saying something this walk cannot represent.
  const { const: _replaced, ...rest } = branches[0] ?? {};
  return { ...rest, enum: values };
};

/**
 * The members every branch of a union contributes, flattened onto one prefix.
 *
 * `undefined` when some branch is not an object with properties, which is how
 * the caller learns to try the closed reading instead.
 */
const objectBranchMembers = (
  branches: readonly JsonSchemaNode[]
): readonly UnionMember[] | undefined => {
  const found = new Map<string, UnionMember>();
  const declaredBy = new Map<string, number>();
  const requiredBy = new Map<string, number>();

  for (const branch of branches) {
    const properties = branch.properties;
    if (properties === undefined) return undefined;
    const required = new Set(branch.required ?? []);
    for (const [key, node] of Object.entries(properties)) {
      declaredBy.set(key, (declaredBy.get(key) ?? 0) + 1);
      if (required.has(key)) requiredBy.set(key, (requiredBy.get(key) ?? 0) + 1);
      // First branch wins, so a key two branches spell differently has one
      // answer rather than the last one emitted.
      if (!found.has(key)) found.set(key, { key, node, isRequired: false });
    }
  }

  const branchCount = branches.length;
  return [...found.values()].map((member) => ({
    ...member,
    isRequired:
      declaredBy.get(member.key) === branchCount &&
      requiredBy.get(member.key) === branchCount,
  }));
};

/** A key every branch declares and every branch closes is the discriminant. */
const discriminantNode = (
  branches: readonly JsonSchemaNode[],
  key: string
): JsonSchemaNode | undefined => {
  const declared: JsonSchemaNode[] = [];
  for (const branch of branches) {
    const node = branch.properties?.[key];
    if (node === undefined) return undefined;
    declared.push(node);
  }
  return mergedClosedNode(declared);
};

/** What a `oneOf` or `anyOf` node offers a form, by one of three readings. */
export function unionBranchesToMembers(
  branches: readonly JsonSchemaNode[]
): UnionReading {
  if (branches.length === 0) return OPAQUE;

  const members = objectBranchMembers(branches);
  if (members !== undefined) {
    return {
      shape: "members",
      members: members.map((member) => {
        const merged = discriminantNode(branches, member.key);
        return merged === undefined ? member : { ...member, node: merged };
      }),
    };
  }

  const closed = mergedClosedNode(branches);
  return closed === undefined ? OPAQUE : { shape: "closed", node: closed };
}
