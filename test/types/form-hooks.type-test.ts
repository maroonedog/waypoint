// ===========================================================================
// form-hooks.type-test.ts — the hooks that know which paths exist.
//
// One React context object serves every form, so the context cannot be
// generic and a path union cannot travel through it. The types therefore do
// not travel: the application REGISTERS them once, and every hook reads them
// from the registry. A component imports nothing and is still checked.
//
// The `@ts-expect-error` lines are the whole point: each one FAILS TO COMPILE
// if the typing ever degrades back to `string`, because a `@ts-expect-error`
// with nothing to suppress is itself an error. That is not hypothetical — the
// first draft of the registry degraded exactly that way, because inferring
// from an unregistered `never` falls back to the parameter's constraint.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import {
  useField,
  useFieldIssues,
  useFieldValue,
  useFieldValues,
  useForm,
  useRows,
  useUncontrolledField,
  type AnyPath,
  type FormTypeRegistry,
} from "form-react";

const orderSchema = z.object({
  name: z.string().min(3),
  owner: z.object({ email: z.string() }),
  items: z.array(z.object({ quantity: z.number(), sku: z.string() })),
  shipments: z.array(
    z.object({ lines: z.array(z.object({ sku: z.string() })) })
  ),
});
const profileSchema = z.object({ handle: z.string(), age: z.number() });

const orderAdapter = zodFormResolver(orderSchema);
const profileAdapter = zodFormResolver(profileSchema);

// The application's one registration, which nothing below imports.
declare module "form-react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
    profile: typeof profileAdapter;
  }
}
void (null as unknown as FormTypeRegistry);

declare const index: number;
declare const spelled: string;

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertExact = <T extends true>(_proof: T): void => undefined;

// ---- the value type is INFERRED, never asserted ---------------------------
function values(): void {
  assertExact<Exact<ReturnType<typeof useField<"owner.email">>["value"], string | undefined>>(true);
  assertExact<Exact<ReturnType<typeof useFieldValue<"items[0].quantity">>, number | undefined>>(true);
  assertExact<Exact<ReturnType<typeof useFieldValues<"items[*].sku">>, readonly string[]>>(true);
}
void values;

// ---- what a component may ask for ----------------------------------------
function accepted(): void {
  useField("owner.email");
  useField("items[*].quantity"); // a rule, for a column read
  useField("items[0].quantity"); // a place
  useField("items"); // the container
  useFieldIssues("name");
  useUncontrolledField("name");
  useRows("items");
  useRows("shipments[0].lines"); // an inner list, by the outer row's address

  // A row hands its own address down, and a path built from it stays checked.
  const shipments = useRows("shipments");
  for (const row of shipments.rows) {
    useRows(`${row.path}.lines`);
  }
}
void accepted;

function refused(): void {
  // @ts-expect-error "owner.emial" is not a path this form declares
  useField("owner.emial");
  // @ts-expect-error the profile form has no items, and this call names it
  useField("profile", "items[0].quantity");
  // @ts-expect-error no such form is registered
  useField("billing", "name");
  // @ts-expect-error "name" is not a list
  useRows("name");

  useField(`items[${index}].quantity`);
  // @ts-expect-error a string spliced into an index is how a path is mis-built
  useField(`items[${spelled}].quantity`);
}
void refused;

// ---- naming a form narrows to that form ----------------------------------
function named(): void {
  assertExact<Exact<ReturnType<typeof useFieldValue<"profile", "age">>, number | undefined>>(true);
  // The handle a named form hands back is that form's handle. `readRoot`
  // stays `unknown` on purpose — defaultValues is `unknown`, so a root being
  // edited is a draft and not yet a T — but every path off it is typed.
  const profile = useForm("profile");
  assertExact<
    Exact<ReturnType<typeof profile.field<"age">>["sources"]["value"]["read"] extends
      () => infer V ? V : never, number | undefined>
  >(true);
  // @ts-expect-error the order form's paths are not this form's
  profile.field("owner.email");
}
void named;

// ---- the union a keyless call is checked against --------------------------
declare const anyPath: AnyPath;
const across: "name" | "owner" | "owner.email" | "items" | "items[*]"
  | "items[*].quantity" | "items[*].sku" | "shipments" | "shipments[*]"
  | "shipments[*].lines" | "shipments[*].lines[*]"
  | "shipments[*].lines[*].sku" | "handle" | "age" = anyPath;
void across;
