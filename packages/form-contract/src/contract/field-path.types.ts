// ===========================================================================
// field-path.types.ts — the legal path literals for a value type.
//
// `[*]` is the only array wildcard and array members are never enumerated.
// That one rule removes `items.name`, `items[0].name`, `tags.length` and
// `items.map` at once: a numeric index is a fact about one value, not about
// the shape, and a form describes the shape.
//
// A vendor that tracks which paths were actually declared should pass those
// instead of these. This exists for the vendors that do not — every member of
// their schema is declared, so the shape is the answer.
// ===========================================================================
import type { IsOpaqueObject } from "./opaque-object.types.js";
import type { PathDepthBudget, PreviousDepth } from "./path-depth.types.js";
import type { ElementOf } from "./element-of.types.js";

/** The union of path literals reachable in T. */
export type FieldPath<T, D extends number = PathDepthBudget> = MemberPaths<T, D>;

type MemberPaths<T, D extends number> =
  NonNullable<T> extends infer U
    ? U extends readonly unknown[]
      ? never
      : IsOpaqueObject<U> extends true
        ? never
        : U extends object
          ? {
              [K in Extract<keyof U, string>]-?: K | BelowPaths<K, U[K], D>;
            }[Extract<keyof U, string>]
          : never
    : never;

type BelowPaths<Prefix extends string, V, D extends number> = D extends 0
  ? never
  : NonNullable<V> extends infer U
    ? U extends readonly unknown[]
      ?
          | `${Prefix}[*]`
          | BelowPaths<`${Prefix}[*]`, ElementOf<U>, PreviousDepth[D]>
      : IsOpaqueObject<U> extends true
        ? never
        : U extends object
          ? Join<Prefix, MemberPaths<U, PreviousDepth[D]>>
          : never
    : never;

type Join<Prefix extends string, Below> = Below extends string
  ? `${Prefix}.${Below}`
  : never;
