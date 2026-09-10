// ===========================================================================
// path-depth.types.ts — the one recursion budget every path type counts down.
//
// A self-referential model has infinitely many paths. Without a budget the
// compiler reports TS2589 and the user sees a broken library rather than a
// long path union, so the union is made finite here instead.
// ===========================================================================

/** How many container hops a generated path may take. */
export type PathDepthBudget = 6;

/** Index by a depth to get its predecessor; 0 has none. */
export type PreviousDepth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8];
