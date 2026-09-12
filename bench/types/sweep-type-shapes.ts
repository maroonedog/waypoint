// ===========================================================================
// sweep-type-shapes.ts — every shape, at three call counts, plus two floors.
//
// Three call counts and not one, because the disagreement this lane was built
// to settle is a disagreement about WHICH cost was being quoted. There are two
// of them and they behave nothing alike:
//
//   baseline (0 calls)  the union `FieldPath<Root>` being CONSTRUCTED. It is
//                       paid in the file that declares the adapter, whether or
//                       not anything addresses the form, because the union
//                       sits in a type annotation.
//   every leaf          the same union being USED, once per component that
//                       names a path.
//
// `1 call` sits between them so that the second figure can be reported as a
// per-call slope rather than as a lump that might be all first-call.
//
// The two floors are subtracted and not published as the answer. `empty` is
// lib.d.ts, which every TypeScript program in the world pays. `packages-only`
// is the `./react` and `.` entries type-checking their own source, which an
// application pays once no matter how large its form is. Neither is a cost of
// the flagship type, and an absolute number that silently contains both is how
// a figure ends up an order of magnitude away from another one.
// ===========================================================================
import type { ShapeUnderTest } from "./shape-under-test.types.ts";
import { nestedObjectShape } from "./nested-object-shape.ts";
import {
  concreteArrayShape,
  declaredArrayShape,
  recordMemberShape,
  selfReferentialShape,
} from "./container-shapes.ts";
import {
  EMPTY_PROGRAM_SOURCE,
  PACKAGES_ONLY_PROGRAM_SOURCE,
  typeProgramSource,
} from "./type-program-source.ts";
import { openProgramDirectory } from "./program-directory.ts";
import { measureWithTsc, type TscMeasurement } from "./measure-with-tsc.ts";

const DEPTHS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const BRANCH = 3;
const WIDTHS = [30, 100, 300] as const;

export interface ShapeRow {
  readonly shape: ShapeUnderTest;
  readonly baseline: TscMeasurement;
  readonly oneCall: TscMeasurement;
  readonly everyLeaf: TscMeasurement;
  /** Which leaves the compiler refused, by path. */
  readonly refusedLeaves: readonly { path: string; code: string }[];
}

export interface SweepResult {
  readonly empty: TscMeasurement;
  readonly packagesOnly: TscMeasurement;
  readonly rows: readonly ShapeRow[];
  readonly repeated: readonly TscMeasurement[];
  readonly repeatedShapeId: string;
  readonly programCount: number;
  readonly minutes: number;
}

export function shapeCatalogue(): readonly ShapeUnderTest[] {
  const depthSweep = DEPTHS.flatMap((depth) => [
    nestedObjectShape(
      `depth-${depth}-distinct`,
      `${BRANCH}-ary tree ${depth} deep, every subtree a different interface`,
      depth,
      BRANCH,
      "distinct"
    ),
    nestedObjectShape(
      `depth-${depth}-shared`,
      `${BRANCH}-ary tree ${depth} deep, one interface per level`,
      depth,
      BRANCH,
      "shared"
    ),
  ]);
  const widthSweep = WIDTHS.map((width) =>
    nestedObjectShape(
      `width-${width}`,
      `${width} string members, no nesting`,
      1,
      width,
      "distinct"
    )
  );
  // Paired with `depth-6-distinct` on purpose: same depth, same branching, two
  // of the root's three subtrees taken out of the path union and nothing else
  // changed. §7 recommends the escape hatch, so §5 has to be able to price it.
  const escapeHatch = nestedObjectShape(
    "opaque-2-of-3",
    `${BRANCH}-ary tree 6 deep, 2 of the root's 3 subtrees opaque`,
    6,
    BRANCH,
    "distinct",
    2
  );
  return [
    ...depthSweep,
    ...widthSweep,
    escapeHatch,
    declaredArrayShape,
    concreteArrayShape,
    recordMemberShape,
    selfReferentialShape,
  ];
}

/**
 * The path each addressing call names, by the line it sits on.
 *
 * Both hooks, because the generator picks one by the path: a place goes to
 * `useField` and a rule to `useFieldValues`. Matching only the first would
 * leave every array row's refusals unattributed and the `addressable` column
 * silently wrong.
 */
const pathByLine = (source: string): Map<number, string> => {
  const found = new Map<number, string>();
  source.split("\n").forEach((text, index) => {
    const call = /use(?:Field|FieldValues)\("(.*)"\)/.exec(text);
    if (call !== null) found.set(index + 1, String(call[1]));
  });
  return found;
};

export function sweepTypeShapes(
  announce: (line: string) => void,
  repeats: number
): SweepResult {
  const shapes = shapeCatalogue();
  const directory = openProgramDirectory();
  const started = Date.now();
  let programCount = 0;

  const compile = (source: string, label: string): TscMeasurement => {
    directory.putProgram(source);
    const measured = measureWithTsc(directory.tsconfigPath);
    programCount += 1;
    announce(
      `${label.padEnd(34)} ${String(measured.instantiations).padStart(10)} instantiations` +
        `  ${measured.typeCheckSeconds.toFixed(2)}s checking` +
        `  ${measured.errors.length} error(s)`
    );
    return measured;
  };

  try {
    const empty = compile(EMPTY_PROGRAM_SOURCE, "empty (lib.d.ts floor)");
    const packagesOnly = compile(
      PACKAGES_ONLY_PROGRAM_SOURCE,
      "packages-only (imports, no shape)"
    );

    const rows: ShapeRow[] = [];
    for (const shape of shapes) {
      const baseline = compile(
        typeProgramSource(shape, []),
        `${shape.id} · 0 calls`
      );
      const oneCall = compile(
        typeProgramSource(shape, shape.leafPaths.slice(0, 1)),
        `${shape.id} · 1 call`
      );
      const everySource = typeProgramSource(shape, shape.leafPaths);
      const everyLeaf = compile(
        everySource,
        `${shape.id} · ${shape.leafPaths.length} calls`
      );
      const named = pathByLine(everySource);
      rows.push({
        shape,
        baseline,
        oneCall,
        everyLeaf,
        refusedLeaves: everyLeaf.errors.flatMap((error) => {
          const path = named.get(error.line);
          return path === undefined ? [] : [{ path, code: error.code }];
        }),
      });
    }

    // The determinism argument for gating is a measurement, so it is taken
    // rather than asserted: the same program, compiled again, from scratch.
    const repeatedShape = shapes.find((shape) => shape.id === "depth-5-distinct");
    if (repeatedShape === undefined) throw new Error("depth-5-distinct is gone");
    const repeatedSource = typeProgramSource(
      repeatedShape,
      repeatedShape.leafPaths
    );
    const repeated: TscMeasurement[] = [];
    for (let attempt = 0; attempt < repeats; attempt += 1) {
      repeated.push(compile(repeatedSource, `repeat ${attempt + 1} of ${repeats}`));
    }

    return {
      empty,
      packagesOnly,
      rows,
      repeated,
      repeatedShapeId: repeatedShape.id,
      programCount,
      minutes: Math.round(((Date.now() - started) / 60_000) * 10) / 10,
    };
  } finally {
    const left = directory.remove();
    if (left !== undefined) announce(`Could not remove ${left} — delete it by hand.`);
  }
}
