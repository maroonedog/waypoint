// ===========================================================================
// container-shapes.ts — the three roots a tree of plain objects cannot reach.
//
// A regular tree measures depth and width and nothing else. These three are
// here because each one exercises a different clause of the path types, and
// each one is a thing a real schema actually contains:
//
//   arrays      — `FieldPath` emits `[*]`, `ConcretePath` turns it into
//                 `[${number}]` for `useField`, and `PartlyBoundPath` keeps or
//                 binds each one for `useFieldValues`. The flagship claim is
//                 that a leaf component can name `items[3].sku`, so the
//                 concrete spelling has to be measured separately from the
//                 declared one rather than assumed to cost the same — and the
//                 two now go through different hooks, which is a second
//                 reason not to assume it.
//   Record      — `Extract<keyof Record<string, T>, string>` is `string`, so
//                 the union grows a TEMPLATE member rather than a literal one.
//                 What that costs, and what it stops refusing, is the point.
//   self-       — the case `PathDepthBudget` exists for. Its banner says the
//   referential   budget is what keeps TS2589 away from a cyclic model; this
//                 is the shape that would produce it if the budget were gone,
//                 so it is the shape that says whether the claim holds.
//
// The self-referential leaves stop at ten hops because an infinite type has
// infinitely many paths and the report needs a counted list. Ten is four past
// the budget, which is enough for the compiler to say where it truncates.
// ===========================================================================
import type { ShapeUnderTest } from "./shape-under-test.types.ts";

const SELF_REFERENTIAL_HOPS = 10;

const ARRAY_DECLARATIONS = `interface Tag {
  label: string;
  weight: number;
}

interface Row {
  left: string;
  right: number;
}

interface Group {
  title: string;
  rows: Row[];
}

interface Item {
  sku: string;
  name: string;
  quantity: number;
  tags: Tag[];
}

interface OrderRoot {
  reference: string;
  issued: string;
  items: Item[];
  groups: Group[];
}`;

const ARRAY_LEAVES = [
  "reference",
  "issued",
  "items[*].sku",
  "items[*].name",
  "items[*].quantity",
  "items[*].tags[*].label",
  "items[*].tags[*].weight",
  "groups[*].title",
  "groups[*].rows[*].left",
  "groups[*].rows[*].right",
] as const;

/** The declared spellings: `items[*].sku`, which is what a descriptor is keyed by. */
export const declaredArrayShape: ShapeUnderTest = {
  id: "array-declared",
  note: "2 arrays, one nested inside the other, addressed by `[*]`",
  declarations: ARRAY_DECLARATIONS,
  rootName: "OrderRoot",
  interfaceCount: 5,
  leafPaths: ARRAY_LEAVES,
};

/**
 * The same root, addressed by PLACE. Every wildcard carries the leaf's own
 * ordinal, so no two calls share a literal and the compiler cannot answer the
 * second one from the first one's cache.
 */
export const concreteArrayShape: ShapeUnderTest = {
  ...declaredArrayShape,
  id: "array-concrete",
  note: "the same root, every wildcard replaced by that leaf's own ordinal",
  leafPaths: ARRAY_LEAVES.map((path, index) =>
    path.split("[*]").join(`[${index}]`)
  ),
};

export const recordMemberShape: ShapeUnderTest = {
  id: "record-member",
  note: "3 leaves plus a `Record<string, Entry>`",
  declarations: `interface Entry {
  amount: number;
  memo: string;
}

interface LedgerRoot {
  reference: string;
  total: number;
  currency: string;
  byId: Record<string, Entry>;
}`,
  rootName: "LedgerRoot",
  interfaceCount: 2,
  leafPaths: [
    "reference",
    "total",
    "currency",
    "byId.a1b2c3.amount",
    "byId.a1b2c3.memo",
  ],
};

const selfReferentialLeaves = (): readonly string[] => {
  const found: string[] = [];
  let prefix = "";
  for (let hop = 0; hop < SELF_REFERENTIAL_HOPS; hop += 1) {
    found.push(`${prefix}name`);
    prefix = `${prefix}child.`;
  }
  return found;
};

export const selfReferentialShape: ShapeUnderTest = {
  id: "self-referential",
  note: `a node that contains itself, addressed ${SELF_REFERENTIAL_HOPS} hops down`,
  declarations: `interface TreeRoot {
  name: string;
  child: TreeRoot;
}`,
  rootName: "TreeRoot",
  interfaceCount: 1,
  leafPaths: selfReferentialLeaves(),
};
