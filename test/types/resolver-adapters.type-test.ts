// ===========================================================================
// resolver-adapters.type-test.ts — what both shipped resolvers hand back,
// pinned for each of them against the same model.
//
// This is what replaced the deleted `FormResolver`. That type pinned the CALL
// — `(schema) => FormAdapter` — and no two vendors agreed on it: zod describes
// and judges from one object, luq needs two, and tsc refused the second
// assignment outright. Arity was never the part worth promising. What a caller
// actually depends on is what comes BACK, and nothing in the repository
// checked that for luq at all, so this file does.
//
// The assertions are spelled through `FormValues` and `FormPaths` rather than
// as an assignment to `FormAdapter<Order, …>`, and that is the whole trick of
// the file. Neither type parameter appears in `fields` or in `validate`, so
// they are phantom and structural assignability ignores them: an adapter
// typed `FormAdapter<object, never>` satisfies `FormAdapter<Order, "owner">`
// and a test written that way would pass while carrying nothing. The two
// helpers read the arguments back off the declared type, which is the only
// way to see them.
//
// The model stays small on purpose, for the reason adapter-types.type-test.ts
// gives: a path type costs instantiations proportional to paths times depth,
// and a realistic fixture makes tsc report TS2589 instead of a real failure.
// ===========================================================================
import { Builder } from "@maroonedog/luq";
import { requiredPlugin } from "@maroonedog/luq/plugins/required";
import { toStandardJsonSchema } from "@maroonedog/luq/standard-schema";
import { z } from "zod";
import type { FieldPath, FormPaths, FormValues } from "form-contract";
import { luqFormResolver } from "form-contract-resolver-luq";
import { zodFormResolver } from "form-contract-resolver-zod";

/** Fails to compile unless both sides are the same type. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

interface Order {
  reference: string;
  owner: { email: string };
  items: { quantity: number }[];
}

/**
 * Written out rather than left as `FieldPath<Order>` so the union is pinned
 * to literals. Comparing two computed types would still agree if both went
 * wrong the same way.
 */
type OrderPaths =
  | "reference"
  | "owner"
  | "owner.email"
  | "items"
  | "items[*]"
  | "items[*].quantity";

assertExact<Exact<FieldPath<Order>, OrderPaths>>(true);

// --- zod -------------------------------------------------------------------

const zodAdapter = zodFormResolver(
  z.object({
    reference: z.string(),
    owner: z.object({ email: z.string() }),
    items: z.array(z.object({ quantity: z.number() })),
  })
);

assertExact<Exact<FormValues<typeof zodAdapter>, Order>>(true);
assertExact<Exact<FormPaths<typeof zodAdapter>, OrderPaths>>(true);

// --- luq -------------------------------------------------------------------

const orderValidator = Builder()
  .use(requiredPlugin)
  .for<Order>()
  .v("reference", (one) => one.string.required())
  .build();

const luqAdapter = luqFormResolver<Order>(
  orderValidator,
  toStandardJsonSchema(orderValidator)
);

assertExact<Exact<FormValues<typeof luqAdapter>, Order>>(true);
assertExact<Exact<FormPaths<typeof luqAdapter>, OrderPaths>>(true);

// The two vendors reach the same adapter type from the same model, which is
// the claim "validator-neutral" makes and the reason both are pinned here
// against one `Order` rather than against a fixture each.
assertExact<
  Exact<FormValues<typeof zodAdapter>, FormValues<typeof luqAdapter>>
>(true);
assertExact<Exact<FormPaths<typeof zodAdapter>, FormPaths<typeof luqAdapter>>>(
  true
);

// --- the gap this file also records ----------------------------------------

// `luqFormResolver<Order>` is written with its type argument above, and has to
// be. `LuqValidatorShape<T>` never mentions `T` in a member, so there is no
// site to infer it from a real validator and `T` falls back to its constraint:
// the call below is `FormAdapter<object, never>`, a form whose every path is a
// compile error. zod has no such spelling because `z.infer<S>` reads the
// schema. The failure is marked rather than asserted, so that closing it —
// by giving `LuqValidatorShape` a member that mentions `T` — makes tsc report
// this unused directive and this paragraph gets deleted with it.
const inferredLuqAdapter = luqFormResolver(
  orderValidator,
  toStandardJsonSchema(orderValidator)
);
// @ts-expect-error T is not inferable from a luq validator, so it degrades to `object`
assertExact<Exact<FormValues<typeof inferredLuqAdapter>, Order>>(true);
