// ===========================================================================
// one-registry-two-bindings.type-test.ts — the claim `./vue` makes about the
// registry, put to the compiler.
//
// The registry was moved out of `./react` and into the root entry because a
// module augmentation names a MODULE: one declared on `.../react` would have
// made the registry React's, and a second binding would have needed a registry
// of its own — at which point a component taking `FormPathTo<string>` reads a
// different interface depending on which binding compiled it.
//
// THIS FILE IS WHERE THAT STOPS BEING AN ARGUMENT. It shares a compilation
// with registered.type-test.ts, which is where the one `declare module
// "@maroonedog/waypoint"` lives. Nothing below augments anything. The Vue
// composables are checked against that augmentation, and the assertions are
// the same ones the React side makes — a good path compiles, a misspelt one
// does not, the value type comes out of the schema and not out of the call
// site, and the prefixed and unprefixed spellings mean the same place.
//
// A FAILURE HERE IS NOT A TYPE-LEVEL NICETY. If `./vue` ever declared its own
// `WaypointForms`, these calls would go on compiling — against an EMPTY
// registry, where `FormPath` is the placeholder message type and every path is
// refused. The `@ts-expect-error` lines are what would then fail, because
// nothing would be an error any more.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createForm } from "@maroonedog/waypoint/core";
import {
  Field,
  FieldRows,
  FormProvider,
  useField,
  useForm,
  useRows,
} from "@maroonedog/waypoint/vue";
import type { FieldBinding } from "@maroonedog/waypoint/vue";
import { h, ref } from "vue";

/**
 * A REAL handle reaches `<FormProvider>` with no cast at the call site.
 *
 * A `FormHandle` is invariant in its value type, so a prop declared at
 * `FormHandle<unknown, string>` is inhabited by no actual form — a caller
 * could only satisfy it by casting, in every application. This is the
 * assertion that `./vue`'s provider does not ask for that.
 */
export function aProviderTakesTheHandleItWasGiven(): unknown {
  const form = createForm({
    adapter: zodFormResolver(z.object({ owner: z.object({ name: z.string() }) })),
    defaultValues: { owner: { name: "" } },
  });
  return h(FormProvider, { form, partial: true }, () => [
    h(Field, { path: "owner.name" }),
    h(FieldRows, { path: "items" }),
  ]);
}

export function everySurface(): void {
  const form = useForm();
  void form.submit(() => undefined);
  useField("owner.name");
  useRows("items");
}

/** The registry registered.type-test.ts declared is the one read here. */
export function theValueTypeComesFromTheSchema(): void {
  const name: FieldBinding<string> = useField("owner.name");
  const sku: FieldBinding<string> = useField("items[0].sku");
  void name;
  void sku;
  // @ts-expect-error the schema says string, and the binding is not widened
  const wrong: FieldBinding<number> = useField("owner.name");
  void wrong;
}

export function eitherSpelling(): void {
  useField("owner.name");
  useField("form:owner.name");
  useRows("items");
  useRows("form:items");
  // @ts-expect-error a misspelling is one with the prefix on as without it
  useField("form:owner.nmae");
}

/**
 * A path that moves. This is the argument Vue has and React does not: a hook
 * re-runs and picks up a changed prop for free, while `setup()` runs once — so
 * the composables take a ref or a getter, and the registry has to check what
 * is INSIDE it.
 */
export function aPathThatMoves(): void {
  const chosen = ref<"owner.name" | "items[0].sku">("owner.name");
  useField(chosen);
  useField(() => "items[0].sku" as const);
  // @ts-expect-error a getter of a misspelt path is still a misspelt path
  useField(() => "owner.nmae" as const);
}
