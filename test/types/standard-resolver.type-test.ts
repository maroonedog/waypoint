// ===========================================================================
// standard-resolver.type-test.ts — the degradation, stated where it costs
// nothing to check.
//
// "This validator declares no JSON Schema" is a fact about a TYPE, and the
// compiler is the only layer that can report it before a form is built, at no
// runtime cost, naming the member that is missing. So the first half of the
// degradation signal is the pair of overloads pinned below: a describing
// vendor reaches the unary one, a judging-only vendor cannot, and the way out
// for the second is to supply the fields the validator could not.
//
// The runtime half — a vendor that declares `jsonSchema` and then throws — is
// what types cannot see, and it is pinned in test/standard-resolver.test.mjs
// instead. Neither half is sufficient alone, which is why there are two files.
//
// The validators here are hand-written rather than imported, because the two
// shapes worth checking are "has jsonSchema" and "has not", and every real
// vendor is only ever one of them.
// ===========================================================================
import type {
  FormPaths,
  FormValues,
  FormFieldDescriptor,
} from "@maroonedog/form-contract";
import {
  standardFormResolver,
  type StandardSchemaV1,
  type StandardSchemaWithJSON,
} from "@maroonedog/form-contract/resolver-standard";

/** Fails to compile unless both sides are the same type. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

interface Order {
  reference: string;
  owner: { email: string };
}

type OrderPaths = "reference" | "owner" | "owner.email";

const DECLARED_FIELDS: readonly FormFieldDescriptor[] = [];

// --- a vendor that implements both specs -----------------------------------

declare const describing: StandardSchemaWithJSON<Order>;

const described = standardFormResolver(describing);

assertExact<Exact<FormValues<typeof described>, Order>>(true);
assertExact<Exact<FormPaths<typeof described>, OrderPaths>>(true);

// The options bag is optional, and `libraryOptions` is the only thing in it.
standardFormResolver(describing, { libraryOptions: { unrepresentable: "any" } });

// --- a vendor that judges and does not describe -----------------------------

declare const judging: StandardSchemaV1<Order>;

// THIS IS THE SIGNAL. The unary overload wants `~standard.jsonSchema` and this
// vendor has none, so the call does not compile — before anything runs, and
// with the compiler naming the missing member rather than a form silently
// drawing nothing.
// @ts-expect-error a validator with no `~standard.jsonSchema` cannot be described
standardFormResolver(judging);

// Passing the fields is the way out, and it says the true thing: the validator
// did not describe the form, so somebody else did.
const supplied = standardFormResolver(judging, { fields: DECLARED_FIELDS });

assertExact<Exact<FormValues<typeof supplied>, Order>>(true);
assertExact<Exact<FormPaths<typeof supplied>, OrderPaths>>(true);

// A describing vendor reaches the same adapter type either way, which is what
// makes "supply the fields yourself" a fallback rather than a different road.
const overridden = standardFormResolver(describing, { fields: DECLARED_FIELDS });
assertExact<Exact<FormValues<typeof overridden>, Order>>(true);

// --- a vendor that declares no types ----------------------------------------

// `types` is optional in the spec. A vendor that omits it degrades to an
// untyped form rather than to `never`, which would be a path union no string
// satisfies — making every typed hook a compile error on a form that works.
declare const untyped: StandardSchemaWithJSON;

const loose = standardFormResolver(untyped);

assertExact<Exact<FormValues<typeof loose>, unknown>>(true);
assertExact<Exact<FormPaths<typeof loose>, string>>(true);
