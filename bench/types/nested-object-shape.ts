// ===========================================================================
// nested-object-shape.ts — a regular tree, at a stated depth and width.
//
// Two shapes with the same leaf count can cost the compiler very different
// amounts, and the difference is whether sibling subtrees are the SAME type.
// `interface L2 { m0: L1; m1: L1; m2: L1 }` gives the compiler one subtree to
// walk and memoise; a real form gives it three different ones, because
// `applicant` and `company` are not the same object. So the mode is an
// argument rather than a decision made here: `distinct` is what a hand-written
// or inferred schema looks like, `shared` is the cheaper thing a synthetic
// probe accidentally measures, and the sweep publishes both so that a reader
// comparing this lane against somebody else's number can see which one they
// built.
//
// The paths are walked separately from the types, and deliberately. Sharing a
// type does not share a POSITION: `m0.m1` and `m1.m1` are two leaves whatever
// interface sits behind them, and a leaf count taken off the declarations
// would undercount the shared mode by the whole memoisation factor.
// ===========================================================================
import type { ShapeUnderTest } from "./shape-under-test.types.ts";

export type SubtreeMode = "distinct" | "shared";

const memberName = (index: number): string => `m${index}`;

interface Emitter {
  readonly declarations: string[];
  readonly byDepth: Map<number, string>;
  next: number;
}

function typeAtDepth(
  depth: number,
  branch: number,
  mode: SubtreeMode,
  emitter: Emitter
): string {
  if (depth === 0) return "string";
  const memoised = emitter.byDepth.get(depth);
  if (mode === "shared" && memoised !== undefined) return memoised;

  const members: string[] = [];
  for (let index = 0; index < branch; index += 1) {
    const below = typeAtDepth(depth - 1, branch, mode, emitter);
    members.push(`  ${memberName(index)}: ${below};`);
  }
  emitter.next += 1;
  const name = `N${emitter.next}`;
  emitter.declarations.push(`interface ${name} {\n${members.join("\n")}\n}`);
  if (mode === "shared") emitter.byDepth.set(depth, name);
  return name;
}

function leavesBelow(
  depth: number,
  branch: number,
  prefix: string,
  found: string[]
): void {
  for (let index = 0; index < branch; index += 1) {
    const path =
      prefix === "" ? memberName(index) : `${prefix}.${memberName(index)}`;
    if (depth === 1) {
      found.push(path);
      continue;
    }
    leavesBelow(depth - 1, branch, path, found);
  }
}

/**
 * A root member the path type stops at, with its data still on it.
 *
 * This is the escape hatch as a user would actually reach for it, and it is
 * built rather than described because the report recommends it: the members are
 * still declared and still typed, so the value keeps its shape; extending
 * `ReadonlyMap` — one of `OpaqueObject`'s arms — is what takes the whole
 * subtree out of the path union. A member simply deleted would measure a
 * smaller form, which is not the thing being recommended.
 */
const opaqueBranchDeclaration = (
  name: string,
  members: readonly string[]
): string =>
  `interface ${name} extends ReadonlyMap<string, unknown> {\n${members.join("\n")}\n}`;

/**
 * A `branch`-ary tree of objects `depth` levels deep, whose leaves are strings.
 * Depth 1 with a large branch is the width sweep; branch 3 with a growing depth
 * is the depth sweep. The last `opaqueRootBranches` of the root's members are
 * made opaque instead, which is how the escape hatch gets a row of its own.
 */
export function nestedObjectShape(
  id: string,
  note: string,
  depth: number,
  branch: number,
  mode: SubtreeMode,
  opaqueRootBranches = 0
): ShapeUnderTest {
  const emitter: Emitter = { declarations: [], byDepth: new Map(), next: 0 };
  const opaque = Math.min(opaqueRootBranches, branch);
  const rootMembers: string[] = [];
  const leafPaths: string[] = [];

  for (let index = 0; index < branch - opaque; index += 1) {
    const below = typeAtDepth(depth - 1, branch, mode, emitter);
    rootMembers.push(`  ${memberName(index)}: ${below};`);
    if (depth === 1) leafPaths.push(memberName(index));
    else leavesBelow(depth - 1, branch, memberName(index), leafPaths);
  }

  for (let index = branch - opaque; index < branch; index += 1) {
    const name = `Opaque${index}`;
    const members: string[] = [];
    // One level further down than the root's plain members, so that an opaque
    // branch carries exactly the data a plain one does. Anything else would
    // compare two different forms and credit the difference to the hatch.
    for (let below = 0; below < branch; below += 1) {
      members.push(
        `  ${memberName(below)}: ${typeAtDepth(Math.max(depth - 2, 0), branch, mode, emitter)};`
      );
    }
    emitter.declarations.push(opaqueBranchDeclaration(name, members));
    rootMembers.push(`  ${memberName(index)}: ${name};`);
    // The member itself stays nameable; nothing under it does.
    leafPaths.push(memberName(index));
  }

  const declarations = [
    ...emitter.declarations,
    `interface Root {\n${rootMembers.join("\n")}\n}`,
  ];
  return {
    id,
    note,
    declarations: declarations.join("\n\n"),
    rootName: "Root",
    interfaceCount: declarations.length,
    leafPaths,
  };
}
