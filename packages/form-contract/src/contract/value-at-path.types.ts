// ===========================================================================
// value-at-path.types.ts — the declared type at a path.
//
// The path is walked as a string rather than parsed into segments first. One
// grammar, written once, in the direction it is read: split on the dot, and
// inside a segment peel the wildcards off the end.
//
// `unknown extends T` is tested before NonNullable because NonNullable<unknown>
// is `{}`, which would collapse an unknown-typed subtree to never on the very
// next segment.
// ===========================================================================
import type { IsOpaqueObject } from "./opaque-object.types.js";
import type { ElementOf } from "./element-of.types.js";

type ReadMember<T, K extends string> = unknown extends T
  ? unknown
  : NonNullable<T> extends infer U
    ? U extends readonly unknown[]
      ? never
      : IsOpaqueObject<U> extends true
        ? never
        : U extends object
          ? K extends keyof U
            ? U[K]
            : never
          : never
    : never;

/** Peels the trailing `[*]` groups of one segment, one hop each. */
type DescendArray<A, Tail extends string> = Tail extends `[*]${infer More}`
  ? DescendArray<ElementOf<A>, More>
  : ElementOf<A>;

type StepInto<T, Segment extends string> =
  Segment extends `${infer Name}[*]${infer Tail}`
    ? DescendArray<ReadMember<T, Name>, Tail>
    : ReadMember<T, Segment>;

/**
 * Optionality survives on the LAST segment only: a form asks whether the leaf
 * may be absent, and an intermediate `undefined` would make every path below
 * an optional member unreadable.
 */
export type ValueAtPath<T, P extends string> = P extends
  `${infer Head}.${infer Rest}`
  ? ValueAtPath<StepInto<T, Head>, Rest>
  : StepInto<T, P>;
