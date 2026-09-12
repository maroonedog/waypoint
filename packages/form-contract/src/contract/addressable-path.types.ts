// ===========================================================================
// addressable-path.types.ts — a declared path, and the places it has.
//
// A descriptor is keyed by the RULE: `items[*].sku`. A value has PLACES:
// `items[0].sku`, `items[1].sku`. Both are things a caller can legitimately
// name, and until this type existed only the first was expressible, so a
// component addressing a fixed row had to drop out of the typed surface
// entirely.
//
// The distinction worth having is not rule-versus-place. It is INDEX versus
// anything else, and a template literal type can see it:
//
//   const i: number;  `items[${i}].sku`   ->  `items[${number}].sku`   ok
//   const s: string;  `items[${s}].sku`   ->  `items[${string}].sku`   rejected
//
// So a computed row index passes and a string spliced into a path — which is
// how a mis-built path is usually made — does not.
//
// The recursion is bounded by the same depth budget the path types use. A
// schema deep enough to exhaust it keeps its declared paths and loses only the
// concrete spellings, which is the safe direction to fail in.
// ===========================================================================
import type { PathDepthBudget } from "./path-depth.types.js";

type Counter = readonly unknown[];

/**
 * Every `[*]` replaced by an index position. `"items[*].sku"` becomes
 * `` `items[${number}].sku` ``, which `"items[0].sku"` is a member of.
 */
export type ConcretePath<
  P extends string,
  D extends Counter = [],
> = D["length"] extends PathDepthBudget
  ? P
  : P extends `${infer Head}[*]${infer Tail}`
    ? `${Head}[${number}]${ConcretePath<Tail, [...D, unknown]>}`
    : P;

/**
 * What a caller may name: the declared path, or one of its places. A path with
 * no array in it is only itself, so nothing widens for a flat form.
 */
export type AddressablePath<P extends string> = P | ConcretePath<P>;

/**
 * The rule a place obeys: every `[0]` back to `[*]`.
 *
 * The reverse of ConcretePath, and the reason `field()` can accept a place
 * while still computing its value type — ValueAtPath descends through `[*]`
 * and has no case for an index, so the index is removed before it is asked.
 */
export type DeclaredOf<P extends string> =
  P extends `${infer Head}[${number}]${infer Tail}`
    ? `${Head}[*]${DeclaredOf<Tail>}`
    : P;
