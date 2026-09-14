// ===========================================================================
// qualified-surfaces.type-test.ts — the surfaces that had nowhere to put a
// form's name, and what they refuse now that the path carries one.
//
// `useField` could always be told which form it meant, because it took the key
// as a second argument. None of the surfaces below could. A `<Field>` has one
// `path` prop and no room beside it; `FormPathTo<string>` HAD no parameter to
// name a form in; `AutoForm`'s `only` was a list of bare strings;
// `FormProvider`'s `formKey` was a `string`, so a typo in it was a typo
// nothing read. Each of them was therefore checked against EVERY registered
// form's paths at once, and one screen's path compiled inside another's.
//
// WHAT THAT COST, and it is what the file is for: none of the refusals below
// was a refusal. Each was an ordinary render that drew an empty control and
// validated nothing, under a component whose types said it was correct.
//
// The registration is form-hooks.type-test.ts's — one program, one registry —
// so `form` is the order form and `profile` is the other.
//
// Written with `createElement` rather than JSX because this program has no
// `jsx` option, and the question is what the props ACCEPT, which is the same
// question either way.
//
// The `@ts-expect-error` lines fail to compile if any of this degrades back,
// because a directive with nothing to suppress is itself an error.
// ===========================================================================
import { createElement } from "react";
import type { ConcretePath } from "@maroonedog/waypoint";
import {
  AutoForm,
  Field,
  FieldRows,
  useErrorSummary,
  useForm,
  useFormStatus,
  useParticipation,
  useRows,
  type AnyPath,
  type FormKey,
  type FormPathOver,
  type FormPathTo,
  type FormProviderProps,
} from "@maroonedog/waypoint/react";

const noRows = (): null => null;

// ---- the union those surfaces used to be checked against --------------------
//
// Still exported, still keyless, and this is the whole of what went wrong: one
// union holds both forms' places, so a prop typed over it had nothing to refuse
// the other screen's path with. `age` belongs to `profile` and `owner.email` to
// `form`, and both are members here.
const fromTheProfileForm: ConcretePath<AnyPath> = "age";
const fromTheOrderForm: ConcretePath<AnyPath> = "owner.email";
void fromTheProfileForm;
void fromTheOrderForm;

// ---- a view component's path prop -----------------------------------------
function fieldProp(): void {
  void createElement(Field, { path: "form:owner.email" });
  void createElement(Field, { path: "profile:handle" });
  // @ts-expect-error the profile form has no owner
  void createElement(Field, { path: "profile:owner.email" });
  // @ts-expect-error nor does either form have this
  void createElement(Field, { path: "form:owner.emial" });
  // @ts-expect-error a rule is not a place, through the prefix as without it
  void createElement(Field, { path: "form:items[*].sku" });
}
void fieldProp;

// ---- the list a <FieldRows> draws ------------------------------------------
function rowsProp(): void {
  void createElement(FieldRows, { path: "form:items", children: noRows });
  // @ts-expect-error the profile form has no lists at all
  void createElement(FieldRows, { path: "profile:items", children: noRows });
  // @ts-expect-error "name" is a string, not a list
  void createElement(FieldRows, { path: "form:name", children: noRows });
}
void rowsProp;

// ---- a row's own address, handed on ----------------------------------------
//
// It arrives qualified, so what is built from it is complete and needs no key
// carried alongside. `useParticipation` takes it as it comes: silencing a row
// by an address that still had its form on the front recorded a dormant root
// no descendant sat under, and the row went on blocking the submit in silence.
function rowAddress(): void {
  const items = useRows("form:items");
  const order = useForm();
  for (const row of items.rows) {
    useParticipation(order, row.path, true);
    void createElement(Field, { path: `${row.path}.sku` });
  }
}
void rowAddress;

// ---- a design-system component's prop, filtered by value --------------------
//
// The value is read in the form the path NAMES. Over a keyless union the most
// this could ask was whether the value is a string in ANY registered form, so
// a path whose own form declares something else there still passed the filter.
declare const aString: FormPathTo<string>;
const stringPlaces:
  | "form:name" | "form:owner.email" | `form:items[${number}].sku`
  | `form:shipments[${number}].lines[${number}].sku`
  | "profile:handle" = aString;
void stringPlaces;

// Naming a form takes that form's paths and no other's, which is what lets a
// component belong to one screen and still be checked.
declare const profileString: FormPathTo<string, "profile">;
const onlyProfile: "profile:handle" = profileString;
void onlyProfile;

// ---- a section component's prop, filtered by what is under it ---------------
declare const skuHolder: FormPathOver<"sku">;
const holdsASku:
  | `form:items[${number}]`
  | `form:shipments[${number}].lines[${number}]` = skuHolder;
void holdsASku;

// ---- the declarations AutoForm may be narrowed to ---------------------------
function autoFormOnly(): void {
  void createElement(AutoForm, { only: ["form:name", "form:items[*]"] });
  // @ts-expect-error the order form's declarations are not the profile's
  void createElement(AutoForm, { only: ["profile:items[*]"] });
  // @ts-expect-error and a misspelling is still a misspelling
  void createElement(AutoForm, { only: ["form:nmae"] });
  // A LIST HAS ONE SPELLING HERE, and it is `items[*]`, above. The bare path
  // is a real path — `useRows` and `<FieldRows>` address the list itself and
  // take it — but it is not a DECLARED one. It used to compile here and then
  // match no node in the descriptor tree, so the narrowing drew nothing and
  // said nothing: the checked spelling being the broken one.
  // @ts-expect-error a list is declared items[*], never items
  void createElement(AutoForm, { only: ["form:items"] });
}
void autoFormOnly;

// ---- the aggregates, which have no path for a name to ride in ---------------
//
// A status and a summary are over a whole form, so the prefix gives them
// nothing and they take the key itself. `useFormStatus` took no argument at
// all, which left a named form's status unreachable; `useErrorSummary` took an
// unchecked string, so a typo in it read as "some other form" and threw at run
// time rather than here.
function aggregates(): void {
  useFormStatus();
  useFormStatus("profile");
  useErrorSummary("form");
  // @ts-expect-error no such form is registered
  useFormStatus("billing");
  // @ts-expect-error nor is this one
  useErrorSummary("checkout");
}
void aggregates;

// ---- the provider's own declaration of which form it carries ----------------
//
// Taken as the prop's own type rather than through an element, because the
// handle a provider accepts is invariant in its value type and `useForm()`
// with two forms registered hands back a union of both — which is a question
// about handles and not about keys.
//
// It was a `string`. A typo in it named a form nothing had registered, and
// since the prefix on every path in the subtree is compared against it, the
// mistake refused the whole subtree rather than one field of it.
type ProviderKey = FormProviderProps<unknown, string>["formKey"];
const carried: ProviderKey = "profile";
void carried;
// @ts-expect-error a key nothing registered refuses every path below it
const mistyped: ProviderKey = "porfile";
void mistyped;

// A key is written into a path, so it is a string and never a symbol.
declare const key: FormKey;
const named: "form" | "profile" = key;
void named;
