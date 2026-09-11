// ===========================================================================
// assert-tree-fibers-match.ts — proof 6.
//
// Every subject must render the same tree ONCE ITS WIRING IS TAKEN OUT. A
// provider, a context or a wrapper its idiom requires is a real cost and it is
// published on every row; what it must not do is make one subject look cheaper
// per interaction because it has fewer fibers to move.
//
// The wiring figure is measured by mounting the subject with no leaves, not
// declared by whoever wrote it. Comparing the remainder is what makes a
// changed-fiber count a statement about the interaction.
// ===========================================================================

export class TreeFiberMismatchError extends Error {
  constructor(first: string, second: string, firstCount: number, secondCount: number) {
    super(
      `"${first}" renders ${firstCount} fibers of form and "${second}" ` +
        `renders ${secondCount}, with the wiring of each already taken out. ` +
        `They are drawing different trees, so a changed-fiber count would be ` +
        `comparing tree sizes rather than interactions.`
    );
    this.name = "TreeFiberMismatchError";
  }
}

export interface TreeMeasurement {
  readonly treeFibers: number;
  /** Measured by mounting the subject with no leaves at all. */
  readonly wiringFibers: number;
}

export function assertTreeFibersMatch(
  trees: ReadonlyMap<string, TreeMeasurement>
): void {
  const entries = [...trees.entries()].map(
    ([subjectId, tree]) =>
      [subjectId, tree.treeFibers - tree.wiringFibers] as const
  );
  const first = entries[0];
  if (first === undefined) return;
  for (const [subjectId, count] of entries.slice(1)) {
    if (count !== first[1]) {
      throw new TreeFiberMismatchError(first[0], subjectId, first[1], count);
    }
  }
}
