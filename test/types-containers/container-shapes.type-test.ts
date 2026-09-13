// ===========================================================================
// container-shapes.type-test.ts — the three containers where the path TYPE and
// the DESCRIPTORS used to disagree, pinned from the type side.
//
// A union, a tuple and a record are the shapes that are not an object and not
// a growable array, and each one had the two halves of the package saying
// different things about it. Two of the three were closed by making the two
// halves agree; the third could not be, and the sentence it earned is in the
// README's limits section. The assertions below are what "agree" means, so a
// change that reopens one of them fails here rather than in a form.
//
// The runtime half — what the resolver actually emits for the same schema —
// is in `test/zod-resolver.test.mjs`, and the two are deliberately written
// against the same shapes. For the union and the tuple, a path this file
// accepts and that file describes nothing for is the defect being guarded
// against.
//
// The record is the exception, and it has to be named here rather than left to
// be discovered: `bag.whatever` and `bag.whatever.label` are accepted below
// while the resolver describes only `bag`. That is not this file failing to
// guard — it is the limit itself. An index signature widens the union to
// `` `bag.${string}` ``, a template cannot enumerate keys nobody has written
// yet, and a descriptor list is enumerated. The README's limits section says
// so in those terms, and `refused()` below records what IS still checked
// underneath: `ValueAtPath` walks the path and answers `never` for a leaf the
// record's value type does not have.
//
// The model stays small for the reason adapter-types.type-test.ts gives: a
// path type costs instantiations proportional to paths times depth.
// ===========================================================================
import { z } from "zod";
import type { FieldPath, FormPaths } from "@maroonedog/waypoint";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import {
  useField,
  useFieldValues,
  type WaypointForms,
} from "@maroonedog/waypoint/react";

/** Fails to compile unless both sides are the same type. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

const schema = z.object({
  who: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
  pair: z.tuple([z.string(), z.number()]),
  rest: z.tuple([z.string()], z.number()),
  bag: z.record(z.string(), z.object({ label: z.string() })),
});

const adapter = zodFormResolver(schema);

declare module "@maroonedog/waypoint/react" {
  interface WaypointForms {
    containers: typeof adapter;
  }
}
void (null as unknown as WaypointForms);

/**
 * Written out rather than left computed, so the union is pinned to literals.
 *
 * `who.a` and `who.b` are here because `MemberPaths` distributes over a union
 * — flattening the branches onto one prefix is what a discriminated-union form
 * draws — and the resolver now emits a descriptor for each of them.
 *
 * `pair` has no `pair[*]` beside it: a fixed tuple is one addressable value.
 * `rest` does, because a tuple with a rest element has length `number` and is a
 * growable array again.
 *
 * `` `bag.${string}` `` and nothing below it is the record limit: an index
 * signature makes the key the whole `string` type, and that template absorbs
 * every path beneath it.
 */
type ContainerPaths =
  | "who"
  | "who.a"
  | "who.b"
  | "pair"
  | "rest"
  | "rest[*]"
  | "bag"
  | `bag.${string}`;

assertExact<Exact<FieldPath<z.infer<typeof schema>>, ContainerPaths>>(true);
assertExact<Exact<FormPaths<typeof adapter>, ContainerPaths>>(true);

function addressable(): void {
  useField("who.a"); // a union branch's member
  useField("pair"); // the whole tuple, drawn by its caller
  useField("rest[0]"); // a place in the rest element
  useField("bag.whatever"); // a record's key
  useField("bag.whatever.label"); // and a member below it
  useFieldValues("rest[*]");
}
void addressable;

function refused(): void {
  // @ts-expect-error a fixed tuple has no positional path; its index is shape
  useField("pair[0]");
  // @ts-expect-error nor a wildcard one
  useFieldValues("pair[*]");
  // @ts-expect-error the union's branches are flat; there is no branch segment
  useField("who.0.a");

  // The record's own subtree IS checked, even though the path union widened to
  // a template that cannot refuse anything. `InhabitedPath` asks `ValueAtPath`,
  // which walks the path and answers `never` for a leaf the record's value type
  // does not have.
  // @ts-expect-error `Entry` has `label`, not `labell`
  useField("bag.whatever.labell");
  // @ts-expect-error and nothing lives two levels below a record's key here
  useField("bag.whatever.label.deeper");
}
void refused;
