// ===========================================================================
// registered.type-test.ts — the packages' own source, with ONE form
// registered.
//
// test/types compiles what the packages EMIT. A .d.ts has no implementation
// signatures in it, so an overload that does not match its own implementation
// compiles there and fails only for whoever builds from source — which is this
// repository's own documentation site, and nobody else, so it went unnoticed.
//
// It is not hypothetical: useForm's implementation returned
// `FormHandle<never, string>`, and a handle is invariant in its value type, so
// the keyless overload stopped matching the moment `AnyValues` was no longer
// `never`. That is to say: it compiled in every compilation that registered
// nothing, and failed in every one that registered a form.
//
// ONE form is also what makes this the place for the unprefixed spelling. An
// application with a single registered form should not have to write its name
// in front of every path it owns, so both spellings are legal here and the
// second half of this file pins that — including the one member for which they
// are NOT interchangeable.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { useField, useForm, useRows } from "@maroonedog/waypoint/react";

const orderAdapter = zodFormResolver(
  z.object({
    owner: z.object({ name: z.string() }),
    items: z.array(z.object({ sku: z.string() })),
    // A member whose NAME contains a colon. It is here because it is the one
    // string on which the two sides of the split could have disagreed, and the
    // pair of assertions below is what says they do not.
    "a:b": z.string(),
  })
);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    form: typeof orderAdapter;
  }
}

export function everySurface(): void {
  const form = useForm();
  void form.submit(() => undefined);
  useField("owner.name");
  useRows("items");
}

/**
 * One form, so a path may name it or not, and both mean the same place.
 *
 * Register a second and the unprefixed spellings leave the union — which is
 * the point at which an application is told, at every call site, that its
 * paths have become ambiguous.
 */
export function eitherSpelling(): void {
  useField("owner.name");
  useField("form:owner.name");
  useRows("items");
  useRows("form:items");
  // @ts-expect-error a misspelling is one with the prefix on as without it
  useField("form:owner.nmae");
}

/**
 * The member the unprefixed arm cannot have, and why it is left out rather
 * than accepted.
 *
 * WHERE A PREFIX ENDS IS LEXICAL: a head qualifies a path only when it stands
 * before the first `.` or `[`. The runtime has to be able to apply that rule
 * and has no list of registered keys to apply any other — it holds the one key
 * the enclosing provider carries — so `a:b` read there is a path in a form
 * called `a`, and that form is not the one enclosing it, so it throws.
 *
 * Accepting bare `a:b` here would therefore have made the CHECKED spelling the
 * one that throws, which is the defect shape this package keeps finding. So it
 * leaves the unprefixed arm and is reached by naming the form, where both
 * sides read it the same way.
 *
 * A colon anywhere else is untouched: the first `.` comes first, so there is
 * no head to mistake for a form.
 */
export function aColonInTheName(): void {
  // @ts-expect-error read bare, "a" would be a form name and not a member name
  useField("a:b");
  useField("form:a:b");
}
