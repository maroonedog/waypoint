// ===========================================================================
// summarize-issues.ts — one pass's blocking issues, grouped by field and put
// in the order a reader meets the fields.
//
// THE ORDER IS THE WHOLE FILE. An error summary that lists "Postcode, Email,
// Name" for a form drawn "Name, Email, Postcode" makes a reader hunt, and a
// summary is read by exactly the people for whom hunting is the expensive
// part. So the list is not in issue order: a validator emits issues in
// whatever order it walked the schema, zod produces them depth-first over its
// own object shape, and neither is a promise about what is on screen.
//
// The order used instead is the one the runtime already has: the tree
// `buildDescriptorTree` derives, which keeps declaration order because
// `AutoForm` draws in declaration order. For a form drawn by `AutoForm` that
// IS DOM order. For hand-written markup it is the order the VENDOR declared,
// which is the best this package can know — nothing here has read the
// document, and a summary computed during render must not.
//
// Rows interleave, which is why this walks a tree rather than sorting on the
// descriptor list's index. Two declared leaves `items[*].sku` and
// `items[*].quantity` are declaration slots 0 and 1, so ranking a concrete
// path by (slot, indices) puts every row's sku before any row's quantity —
// `items[0].sku, items[1].sku, items[0].quantity`. A reader meets them
// `items[0].sku, items[0].quantity, items[1].sku`. Interleaving the index
// where it OCCURS rather than appending it is what gets that right, and it is
// the only reason a flat sort key was not enough.
//
// A path the tree does not know — the interesting case, an issue a server
// handed the form about `payment`, which no descriptor declares — is not
// dropped and not guessed at. It sorts after everything the tree places, in
// the order the issues arrived, and its label is absent.
//
// NO LABEL IS INVENTED. `FormFieldDescriptor.label` is optional on purpose
// (its own comment says why: turning `owner.name` into "Owner name" decides
// casing, wording and language, which is the application's business), and a
// summary that fell back to the path would put `items[0].sku` in front of the
// person this feature exists for. So the absence is reported as an absence and
// the caller chooses, exactly as it does for a field's own label.
// ===========================================================================
import type { FormFieldDescriptor, FormIssue } from "../../contract/index.js";
import type { DescriptorNode } from "../descriptors/descriptor-tree.types.js";
import { splitConcretePath } from "../path/concrete-path.js";

/** One field's worth of a summary: what to say, and what it is about. */
export interface FieldIssueSummary {
  /** The concrete path, which is also the `name` its control carries. */
  readonly path: string;
  /** As the schema declared it, or absent. Nothing is derived from the path. */
  readonly label: string | undefined;
  /** The first issue's message — what a one-line-per-field summary shows. */
  readonly message: string;
  /** All of this path's blocking issues, first one first. */
  readonly issues: readonly FormIssue[];
}

export interface IssueSummaryRequest {
  /** The containers and fields in declaration order — `FormHandle.tree`. */
  readonly tree: readonly DescriptorNode[];
  /** What blocked. Already filtered for warnings and dormant subtrees. */
  readonly issues: readonly FormIssue[];
}

/** Where one path sits in the tree, and what the tree says about it. */
interface TreePlace {
  /** Sibling ranks and row indices, outermost first. Compared elementwise. */
  readonly rank: readonly number[];
  readonly descriptor: FormFieldDescriptor | undefined;
}

/** The trailing member of a declared node path: `items[*].sku` is `sku`. */
const memberNameOf = (declaredPath: string): string => {
  const lastDot = declaredPath.lastIndexOf(".");
  return lastDot === -1 ? declaredPath : declaredPath.slice(lastDot + 1);
};

/**
 * @returns where a concrete path sits, or undefined when the tree does not
 * describe it. A path that runs past a leaf — an issue reported below a field
 * the vendor declared as one value — ranks AT that leaf, because that is the
 * element a reader will be sent to.
 */
function placeInTree(
  tree: readonly DescriptorNode[],
  concretePath: string
): TreePlace | undefined {
  const rank: number[] = [];
  let siblings: readonly DescriptorNode[] = tree;
  for (const segment of splitConcretePath(concretePath)) {
    if (segment.kind === "index") {
      rank.push(segment.index);
      continue;
    }
    const at = siblings.findIndex(
      (node) => memberNameOf(node.path) === segment.name
    );
    const node = siblings[at];
    if (node === undefined) return undefined;
    rank.push(at);
    if (node.kind === "field") return { rank, descriptor: node.descriptor };
    siblings = node.children;
  }
  // A container: the array itself, or a group. It has no descriptor of its
  // own, and its rank is a prefix of its children's, so it sorts above them.
  return rank.length === 0 ? undefined : { rank, descriptor: undefined };
}

const compareRanks = (
  left: readonly number[],
  right: readonly number[]
): number => {
  const shared = Math.min(left.length, right.length);
  for (let at = 0; at < shared; at += 1) {
    const one = left[at] ?? 0;
    const other = right[at] ?? 0;
    if (one !== other) return one - other;
  }
  return left.length - right.length;
};

interface Placed {
  readonly summary: FieldIssueSummary;
  readonly place: TreePlace | undefined;
  /** The order this path's first issue arrived in, as the last tiebreak. */
  readonly arrival: number;
}

/**
 * @returns one entry per path that carries an issue, in the order a reader
 * meets the fields. The entries are grouped, so a field with three complaints
 * is one row and carries all three.
 */
export function summarizeIssues(
  request: IssueSummaryRequest
): readonly FieldIssueSummary[] {
  const byPath = new Map<string, FormIssue[]>();
  for (const issue of request.issues) {
    const held = byPath.get(issue.path);
    if (held === undefined) byPath.set(issue.path, [issue]);
    else held.push(issue);
  }

  const placed: Placed[] = [];
  let arrival = 0;
  for (const [path, issues] of byPath) {
    const place = placeInTree(request.tree, path);
    placed.push({
      summary: {
        path,
        label: place?.descriptor?.label,
        message: issues[0]?.message ?? "",
        issues,
      },
      place,
      arrival,
    });
    arrival += 1;
  }

  placed.sort((left, right) => {
    if (left.place === undefined || right.place === undefined) {
      // A path the tree cannot place goes after every path it can, and keeps
      // the order it arrived in relative to other unplaceable ones.
      if (left.place !== undefined) return -1;
      if (right.place !== undefined) return 1;
      return left.arrival - right.arrival;
    }
    const byRank = compareRanks(left.place.rank, right.place.rank);
    return byRank === 0 ? left.arrival - right.arrival : byRank;
  });

  return placed.map((entry) => entry.summary);
}
