// ===========================================================================
// inhabited-path.types.ts — whether the value type actually has anything at a
// path, asked of the grammar that already knows.
//
// THE UNION IS NOT ALWAYS THE CHECK, and that is the whole idea here. A member
// typed `Record<string, Entry>` makes `K` the whole `string` type, so
// `FieldPath` emits `` `byId.${string}` `` beside `` `byId.${string}.amount` ``
// — and the first is a SUPERTYPE of the second, so TypeScript absorbs it and
// the record's entire subtree collapses to one template member. `byId.x.memo`
// and `byId.x.memoo` are then both in the union, which is to say the union
// stopped checking anything below a record's key. That cannot be fixed where
// it happens: there is no way to spell one dot-free segment of `string`.
//
// It does not have to be fixed there. `ValueAtPath` walks the path segment by
// segment and asks `K extends keyof U` at every hop, so it already answers
// `never` for `byId.x.memoo` while answering `number` for `byId.x.amount`. So
// the union stays the CONSTRAINT — it is what produces the suggestions and the
// "did you mean" — and this narrows the parameter beside it.
//
// Reusing `ValueAtPath` rather than writing a second walker is deliberate. The
// first attempt here split on "." alone and refused `items[0].sku`, which is
// what a second grammar does: it drifts from the first one, and then two files
// disagree about what a path is.
//
// T is DISTRIBUTED, because a call that names no form is checked against every
// registered form at once and a union of roots walked as one object collapses
// to never on the first segment. A path that exists in any one of them is
// inhabited.
// ===========================================================================
import type { DeclaredOf } from "./addressable-path.types.js";
import type { ValueAtPath } from "./value-at-path.types.js";

/**
 * `K` when `T` has a value at it, and `never` when it does not.
 *
 * Intersected into a path parameter — `path: K & InhabitedPath<T, K>` — so the
 * union constraint goes on naming the alternatives while this refuses the
 * spellings the union was too wide to see. A path union with no record in it
 * is already exact, so for those this rejects nothing and only costs.
 */
export type InhabitedPath<T, K extends string> = [
  T extends unknown ? ValueAtPath<T, DeclaredOf<K>> : never,
] extends [never]
  ? never
  : K;
