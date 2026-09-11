// ===========================================================================
// form-hooks.type-test.ts — the hook that knows which paths exist.
//
// `useField` takes a `string`, and it has to: one React context object serves
// every form, so the context cannot be generic and the path union dies at that
// boundary. Measured consequence, before this file existed: a misspelt path
// rendered an empty input that was never validated and threw nothing.
//
// `createFormHooks` closes it from the other side — the hooks are made once
// from the adapter, so they carry `TPath` without the context having to. The
// `@ts-expect-error` lines below are the whole point: each one FAILS TO
// COMPILE if the typing ever degrades back to `string`, because a
// `@ts-expect-error` with nothing to suppress is itself an error.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import {
  createFormHooks,
  useField,
  type PathsOf,
  type ValuesOf,
} from "form-react";

const schema = z.object({
  name: z.string().min(3),
  owner: z.object({ email: z.string() }),
  items: z.array(z.object({ quantity: z.number() })),
});

const OrderForm = createFormHooks(zodFormResolver(schema));

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

// ---- the paths and the value type come back out --------------------------
assertExact<Exact<ValuesOf<typeof OrderForm>["name"], string>>(true);
assertExact<Exact<ValuesOf<typeof OrderForm>["owner"]["email"], string>>(true);

declare const somePath: PathsOf<typeof OrderForm>;
// The element container itself is a declared path too, which is what lets a
// row scope address the row rather than only the fields inside it.
const known:
  | "name"
  | "owner"
  | "owner.email"
  | "items"
  | "items[*]"
  | "items[*].quantity" = somePath;
void known;

// ---- what a component is allowed to ask for ------------------------------
declare function inAComponent(): void;

function accepted(): void {
  OrderForm.useField("owner.email");
  OrderForm.useFieldValue("items[*].quantity");
  OrderForm.useFieldIssues("name");
  OrderForm.useUncontrolledField("name");
}
void accepted;
void inAComponent;

function rejected(): void {
  // @ts-expect-error a misspelt path is not a member of the path union
  OrderForm.useField("owner.emial");

  // @ts-expect-error a path from a different form is not a member either
  OrderForm.useFieldValue("billing.postcode");

  // @ts-expect-error an array member is never enumerated, so a bare index is not a path
  OrderForm.useUncontrolledField("items[0].quantity");

  // @ts-expect-error the local name of a scoped field is not a whole path
  OrderForm.useFieldIssues("email");
}
void rejected;

// ---- and the untyped hook is still there, still taking anything ----------
// This is the escape hatch, and it is deliberately not narrowed: a record
// field addressed dynamically has no declared path to check against.
function stillPermissive(): void {
  useField("anything.at.all");
}
void stillPermissive;

// ---- the value type of a field follows the path --------------------------
declare const quantity: ReturnType<
  typeof OrderForm.useFieldValue<number>
>;
assertExact<Exact<typeof quantity, number | undefined>>(true);
