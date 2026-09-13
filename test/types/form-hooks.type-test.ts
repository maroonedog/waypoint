// ===========================================================================
// form-hooks.type-test.ts — the hooks that know which paths exist.
//
// One React context object serves every form, so the context cannot be
// generic and a path union cannot travel through it. The types therefore do
// not travel: the application REGISTERS them once, and every hook reads them
// from the registry. A component imports nothing and is still checked.
//
// EVERY PATH BELOW NAMES ITS FORM, because two are registered here and a hook
// call carries no other way to say which one it meant. `form:owner.email` is
// the order form's; `profile:age` is the other's. The prefix is what makes the
// cross-form calls in `refused` refusals rather than the acceptances they were
// when one union served every form at once.
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
//
// Read in the form the path NAMES, which is a question the keyless spelling
// could not ask: the most it could ask was what the value is in ANY
// registered form.
function values(): void {
  assertExact<Exact<ReturnType<typeof useField<"form:owner.email">>["value"], string | undefined>>(true);
  assertExact<Exact<ReturnType<typeof useFieldValue<"form:items[0].quantity">>, number | undefined>>(true);
  assertExact<Exact<ReturnType<typeof useFieldValues<"form:items[*].sku">>, readonly string[]>>(true);
  assertExact<Exact<ReturnType<typeof useFieldValue<"profile:age">>, number | undefined>>(true);
}
void values;

// ---- what a component may ask for ----------------------------------------
function accepted(): void {
  useField("form:owner.email");
  useField("form:items[0].quantity"); // a place
  useField("form:items"); // the container
  useFieldIssues("form:name");
  useUncontrolledField("form:name");
  useRows("form:items");
  useRows("form:shipments[0].lines"); // an inner list, by the outer row's address
  useField("profile:handle"); // the other form, named the same way

  // A row hands its own address down, and a path built from it stays checked.
  // `row.path` is qualified, so what is built from it needs no key threaded
  // beside it.
  const shipments = useRows("form:shipments");
  for (const row of shipments.rows) {
    useRows(`${row.path}.lines`);
  }
}
void accepted;

function refused(): void {
  // @ts-expect-error "owner.emial" is not a path this form declares
  useField("form:owner.emial");
  // @ts-expect-error the profile form has no items, and this call names it
  useField("profile:items[0].quantity");
  // @ts-expect-error no such form is registered
  useField("billing:name");
  // @ts-expect-error "name" is not a list
  useRows("form:name");
  // @ts-expect-error two forms are registered, so a path has to say which
  useField("owner.email");

  useField(`form:items[${index}].quantity`);
  // @ts-expect-error a string spliced into an index is how a path is mis-built
  useField(`form:items[${spelled}].quantity`);
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
  useField("form:items[*].quantity");
  // @ts-expect-error the same handle, so the same answer
  useFieldValue("form:items[*].sku");
  // @ts-expect-error likewise
  useFieldIssues("form:items[*].sku");
  // @ts-expect-error likewise
  useUncontrolledField("form:items[*].sku");
  // @ts-expect-error one list has one row order; this names as many as there are shipments
  useRows("form:shipments[*].lines");
  // `useParticipation` takes either spelling, and strips a prefix against the
  // enclosing provider like every other path surface.
  // @ts-expect-error a wildcard dormant root matches nothing and silences nothing
  useParticipation(useForm(), "items[*]", false);
}
void ruleWhereAPlaceIsRequired;

// ---- a column read is WIDER than either, which is the other half -----------
function columns(): void {
  useFieldValues("form:items[*].sku"); // every sku in the list
  useFieldValues("form:shipments[*].lines[*].sku"); // every sku in every shipment
  // One shipment's column. The runtime has always expanded this — the type
  // used to refuse it, because `AddressablePath` offers all the wildcards or
  // none and a partly bound path is in neither half.
  useFieldValues("form:shipments[0].lines[*].sku");
  useFieldValues(`form:shipments[${index}].lines[*].sku`);
  assertExact<
    Exact<
      ReturnType<typeof useFieldValues<"form:shipments[0].lines[*].sku">>,
      readonly string[]
    >
  >(true);
  // @ts-expect-error a string spliced into an index is still how a path is mis-built
  useFieldValues(`form:shipments[${spelled}].lines[*].sku`);
  // @ts-expect-error and a misspelling is still a misspelling
  useFieldValues("form:items[*].skuu");
}
void columns;

// ---- a place a VIEW component is handed -----------------------------------
//
// `FormPath` is what a design-system component's `path` prop takes, so it is
// the places and not the rules: such a component hands what it receives to
// `useField`. Every member names its form, so the prop says not only which
// paths it accepts but which form each of them belongs to.
declare const viewPath: FormPath;
const onlyPlaces:
  | "form:name" | "form:owner" | "form:owner.email" | "form:items"
  | `form:items[${number}]`
  | `form:items[${number}].quantity` | `form:items[${number}].sku`
  | "form:shipments" | `form:shipments[${number}]`
  | `form:shipments[${number}].lines`
  | `form:shipments[${number}].lines[${number}]`
  | `form:shipments[${number}].lines[${number}].sku`
  | "profile:handle" | "profile:age" = viewPath;
void onlyPlaces;

// ---- naming a form narrows to that form ----------------------------------
function named(): void {
  assertExact<Exact<ReturnType<typeof useFieldValue<"profile:age">>, number | undefined>>(true);
  // The handle a named form hands back is that form's handle. `readRoot`
  // stays `unknown` on purpose — defaultValues is `unknown`, so a root being
  // edited is a draft and not yet a T — but every path off it is typed.
  //
  // A handle addresses ONE form, so the paths it takes carry no prefix: the
  // key was spent naming the handle, and there is nothing left to disambiguate.
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
//
// `AnyPath` is every registered form's declarations with no form attached, and
// it stays that way: it is what an adapter-shaped type is compared against,
// not what a call site is offered.
declare const anyPath: AnyPath;
const across: "name" | "owner" | "owner.email" | "items" | "items[*]"
  | "items[*].quantity" | "items[*].sku" | "shipments" | "shipments[*]"
  | "shipments[*].lines" | "shipments[*].lines[*]"
  | "shipments[*].lines[*].sku" | "handle" | "age" = anyPath;
void across;
