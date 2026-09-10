// ===========================================================================
// element-of.types.ts
//
// `unknown extends T` is tested first: NonNullable<unknown> is `{}`, which
// matches no array and would collapse an unknown-typed member to never.
// ===========================================================================

/** What an array holds, or never when the type is not an array. */
export type ElementOf<T> = unknown extends T
  ? unknown
  : NonNullable<T> extends infer U
    ? U extends readonly (infer E)[]
      ? E
      : never
    : never;
