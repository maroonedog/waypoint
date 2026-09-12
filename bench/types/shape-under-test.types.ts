// ===========================================================================
// shape-under-test.types.ts — one root type, and the paths it really has.
//
// `leafPaths` is a LIST and not a count, for two reasons. The report has to
// state a leaf count that was counted rather than one worked out from
// `branch ** depth` — three separate probes of this cost disagreed by more
// than an order of magnitude, and part of that disagreement was arithmetic
// about a shape nobody had enumerated. And the calls a program makes have to
// be the shape's own paths, so `useField` is resolved against the same type
// the adapter was declared with rather than against a path somebody typed.
//
// `interfaceCount` travels with the shape because two roots with identical
// leaf counts can cost very different amounts: subtrees that are the SAME
// interface are memoised by the compiler and subtrees that are distinct are
// not, which is the axis the depth sweep varies on purpose.
// ===========================================================================

/** A root type the sweep compiles, with everything the report has to state. */
export interface ShapeUnderTest {
  /** Names the row. */
  readonly id: string;
  /** One line for the table's own column, in the reader's terms. */
  readonly note: string;
  /** The interface declarations, ready to paste into a program. */
  readonly declarations: string;
  /** The name the adapter is declared over. */
  readonly rootName: string;
  /** How many interfaces `declarations` holds. */
  readonly interfaceCount: number;
  /** Every leaf the generator emitted — counted, never computed. */
  readonly leafPaths: readonly string[];
}
