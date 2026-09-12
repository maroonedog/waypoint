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
import type { FieldPath, FormPaths, FormValues } from "@maroonedog/form-contract";
import { luqFormResolver } from "@maroonedog/form-contract/resolver-luq";
import { standardFormResolver } from "@maroonedog/form-contract/resolver-standard";
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";

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

const luqAdapter = luqFormResolver<Order>(toStandardJsonSchema(orderValidator));


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

// --- the gap this file used to record, now closed --------------------------

// This paragraph used to say that `luqFormResolver<Order>` HAD to be written
// with its type argument: the old `LuqValidatorShape<T>` never mentioned `T`
// in a member, so there was nowhere to infer it from and the call degraded to
// `FormAdapter<object, never>` — a form whose every path is a compile error.
// It ended by predicting that giving the parameter a member that mentions `T`
// would make tsc report an unused `@ts-expect-error` here.
//
// That is what happened. `LuqDescribableValidator<T>` extends the Standard
// Schema shape, whose `types?: { input: T }` is exactly such a member, so `T`
// is now read off the validator. The explicit argument above is kept only
// because the two adapters are compared against one another and pinning both
// sides is the point of that comparison.
const inferredLuqAdapter = luqFormResolver(toStandardJsonSchema(orderValidator));
assertExact<Exact<FormValues<typeof inferredLuqAdapter>, Order>>(true);
assertExact<Exact<FormPaths<typeof inferredLuqAdapter>, OrderPaths>>(true);

// --- and the half of it that is not inferrable -----------------------------

// A validator speaking both specs and declaring no `types`. There is no
// inference site, so `T` stays at its `object` constraint and `FieldPath` of
// that is `never` — a path union no string satisfies, which would make every
// hook on the form a compile error. Both resolvers degrade it to `string`
// instead, and they are pinned TOGETHER because the defect was that they
// disagreed: `resolver-luq` wrote `FieldPath<T>` directly and handed back
// `never` while `standardFormResolver` handed back `string` for the same
// argument.
declare const untypedValidator: {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "hand-written";
    readonly validate: (value: unknown) => { readonly issues?: undefined };
    readonly jsonSchema: {
      readonly input: (options: { target: string }) => Record<string, unknown>;
    };
  };
  validate(
    value: unknown,
    options?: { readonly abortEarly?: boolean }
  ): {
    readonly valid: boolean;
    readonly issues: readonly { readonly path: string; readonly message: string }[];
  };
};

const untypedViaLuq = luqFormResolver(untypedValidator);
const untypedViaStandard = standardFormResolver(untypedValidator);
assertExact<Exact<FormPaths<typeof untypedViaLuq>, string>>(true);
assertExact<Exact<FormPaths<typeof untypedViaStandard>, string>>(true);
