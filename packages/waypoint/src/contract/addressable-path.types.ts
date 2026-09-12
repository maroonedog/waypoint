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
//
// THREE SPELLINGS LIVE HERE AND EACH HAS ONE CALLER SHAPE, which is the
// correction this file needed. The rule-or-place union used to be what every
// hook took, and almost none of them wanted it: a hook that ends at
// `assertConcretePath` was admitting precisely the spelling that throws. So a
// surface addressing ONE value takes `ConcretePath`, the one surface reading a
// COLUMN takes `PartlyBoundPath` — which is wider than either — and
// `AddressablePath` is left for a caller who genuinely means both.
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
 * What a caller may name when it means either: the declared path, or one of
 * its places. A path with no array in it is only itself, so nothing widens for
 * a flat form.
 *
 * Nothing in this package passes it to a parameter any more. Every surface
 * that took it meant one of the two halves, and offering both is what let
 * `useField("items[*].sku")` compile and then throw. It stays exported because
 * an application writing its own wrapper over both readings needs the name.
 */
export type AddressablePath<P extends string> = P | ConcretePath<P>;

/**
 * Every `[*]` independently kept or bound, so `shipments[*].lines[*].sku` also
 * spells `shipments[0].lines[*].sku`.
 *
 * This is the type of a COLUMN READ, and it is WIDER than `AddressablePath`
 * rather than narrower. That union offers all the wildcards or none of them,
 * and a partly bound path is in neither half — so `useFieldValues` refused the
 * exact spelling its own banner claims works and `expandDeclaredPath` has
 * always expanded. A path with one wildcard left still names a column; it
 * names one row's column instead of every row's.
 *
 * Two union members per wildcard, so the same depth budget stops the
 * recursion. At the deepest shape this repository ships — two wildcards — that
 * is four members.
 */
export type PartlyBoundPath<
  P extends string,
  D extends Counter = [],
> = D["length"] extends PathDepthBudget
  ? P
  : P extends `${infer Head}[*]${infer Tail}`
    ?
        | `${Head}[*]${PartlyBoundPath<Tail, [...D, unknown]>}`
        | `${Head}[${number}]${PartlyBoundPath<Tail, [...D, unknown]>}`
    : P;

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
