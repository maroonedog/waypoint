// ===========================================================================
// adapter-types.type-test.ts — proves the adapter carries the value type.
//
// The point of the type parameters is that a misspelt path fails to compile.
// A test that only inspects `fields` at runtime would pass with `TPath` set to
// `string`, which is the defect this file exists to catch.
//
// The model is deliberately small. A path type costs instantiations
// proportional to paths times depth, and a realistically sized fixture makes
// the compiler report TS2589 rather than a failing assertion.
// ===========================================================================
import { z } from "zod";
import type { FieldPath, FormPaths, FormValues, ValueAtPath } from "@maroonedog/waypoint";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";

const schema = z.object({
  name: z.string().min(3),
  age: z.number().min(18),
  owner: z.object({ email: z.string() }),
  items: z.array(z.object({ quantity: z.number() })),
});

const adapter = zodFormResolver(schema);

type Values = FormValues<typeof adapter>;
type Paths = FormPaths<typeof adapter>;

/** Fails to compile unless both sides are the same type. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

// The value type survives the adapter rather than degrading to unknown.
assertExact<Exact<Values["name"], string>>(true);
assertExact<Exact<Values["age"], number>>(true);
assertExact<Exact<Values["owner"]["email"], string>>(true);

// The paths are the paths of that type, wildcards included.
const declared: Paths = "items[*].quantity";
void declared;
const nested: Paths = "owner.email";
void nested;

// @ts-expect-error a misspelt path is not a member of the path union
const misspelt: Paths = "nmae";
void misspelt;

// @ts-expect-error an array member is never enumerated, so a bare index is not a path
const indexed: Paths = "items[0].quantity";
void indexed;

// ValueAtPath resolves through a wildcard.
assertExact<Exact<ValueAtPath<Values, "items[*].quantity">, number>>(true);
assertExact<Exact<ValueAtPath<Values, "owner.email">, string>>(true);

// FieldPath over the inferred type agrees with what the adapter published.
assertExact<Exact<FieldPath<Values>, Paths>>(true);
