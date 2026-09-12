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
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import {
  useField,
  useFieldIssues,
  useFieldValue,
  useFieldValues,
  useForm,
  useParticipation,
  useRows,
  useUncontrolledField,
  type AnyPath,
  type FormPath,
  type FormTypeRegistry,
} from "@maroonedog/waypoint/react";

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
declare module "@maroonedog/waypoint/react" {
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

// ---- a rule is not a place, and the type says so before the runtime does ---
//
// Every one of these compiled clean before `ConcretePath` replaced
// `AddressablePath` on these surfaces, and every one of them then threw on the
// first render — except `useParticipation`, which threw nothing and silently
// went on blocking the submit, because a dormant root is matched with
// `isAncestorPath` and `isAncestorPath("items[*]", "items[0].sku")` is false.
function ruleWhereAPlaceIsRequired(): void {
  // @ts-expect-error one field is one place; the column read is useFieldValues
  useField("items[*].quantity");
  // @ts-expect-error the same handle, so the same answer
  useFieldValue("items[*].sku");
  // @ts-expect-error likewise
  useFieldIssues("items[*].sku");
  // @ts-expect-error likewise
  useUncontrolledField("items[*].sku");
  // @ts-expect-error one list has one row order; this names as many as there are shipments
  useRows("shipments[*].lines");
  // @ts-expect-error a wildcard dormant root matches nothing and silences nothing
  useParticipation(useForm(), "items[*]", false);
}
void ruleWhereAPlaceIsRequired;

// ---- a column read is WIDER than either, which is the other half -----------
function columns(): void {
  useFieldValues("items[*].sku"); // every sku in the list
  useFieldValues("shipments[*].lines[*].sku"); // every sku in every shipment
  // One shipment's column. The runtime has always expanded this — the type
  // used to refuse it, because `AddressablePath` offers all the wildcards or
  // none and a partly bound path is in neither half.
  useFieldValues("shipments[0].lines[*].sku");
  useFieldValues(`shipments[${index}].lines[*].sku`);
  assertExact<
    Exact<
      ReturnType<typeof useFieldValues<"shipments[0].lines[*].sku">>,
      readonly string[]
    >
  >(true);
  // @ts-expect-error a string spliced into an index is still how a path is mis-built
  useFieldValues(`shipments[${spelled}].lines[*].sku`);
  // @ts-expect-error and a misspelling is still a misspelling
  useFieldValues("items[*].skuu");
}
void columns;

// ---- a place a VIEW component is handed -----------------------------------
//
// `FormPath` is what a design-system component's `path` prop takes, so it is
// the places and not the rules: such a component hands what it receives to
// `useField`.
declare const viewPath: FormPath;
const onlyPlaces:
  | "name" | "owner" | "owner.email" | "items" | `items[${number}]`
  | `items[${number}].quantity` | `items[${number}].sku` | "shipments"
  | `shipments[${number}]` | `shipments[${number}].lines`
  | `shipments[${number}].lines[${number}]`
  | `shipments[${number}].lines[${number}].sku` | "handle" | "age" = viewPath;
void onlyPlaces;

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
