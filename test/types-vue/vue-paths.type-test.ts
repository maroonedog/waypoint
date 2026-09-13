// ===========================================================================
// vue-paths.type-test.ts — the Vue call site, checked the way a Vue
// application's own build would check it.
//
// The Vue entry had runtime tests and no type program, and the hole that left
// is the one below: a path handed in as a GETTER inferred nothing, so the
// binding came back typed with the union of every value in the form and
// `setValue` accepted anything that appeared anywhere in it. The path spelling
// was still checked; only the value type was lost, and losing it silently is
// worse than losing it loudly.
// ===========================================================================
import { ref } from "vue";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { useField, useRows } from "@maroonedog/waypoint/vue";

const accountSchema = z.object({
  owner: z.object({ name: z.string(), age: z.number() }),
  tags: z.array(z.string()),
});
const accountAdapter = zodFormResolver(accountSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    account: typeof accountAdapter;
  }
}

/** The three spellings a Vue caller has, each checked the same. */
export function Spellings(): void {
  const literal = useField("account:owner.age");
  literal.setValue(18);
  // @ts-expect-error a number field does not take a string
  literal.setValue("eighteen");

  const held = ref("account:owner.age" as const);
  const fromRef = useField(held);
  fromRef.setValue(18);
  // @ts-expect-error a number field does not take a string
  fromRef.setValue("eighteen");

  const fromGetter = useField(() => "account:owner.age" as const);
  fromGetter.setValue(18);
  // @ts-expect-error a number field does not take a string
  fromGetter.setValue("eighteen");
}

export function Refusals(): void {
  // @ts-expect-error no such place
  useField("account:owner.agee");
  // @ts-expect-error no form is registered under that name
  useField("nosuchform:owner.age");
  // @ts-expect-error the same, through a getter
  useField(() => "account:owner.agee" as const);
}

/**
 * A list, in the same three spellings.
 *
 * The ROW VALUE is not what is pinned here, because `insert(at, value?:
 * unknown)` is what `./react` and `./core` both declare — a row's shape is
 * deliberately not checked at this call, in either binding. What is pinned is
 * the path, which is checked in all three spellings.
 */
export function ListSpellings(): void {
  useRows("account:tags").insert(0, "x");
  useRows(ref("account:tags" as const)).insert(0, "x");
  useRows(() => "account:tags" as const).insert(0, "x");

  // @ts-expect-error no such list
  useRows("account:tagz");
  // @ts-expect-error the same, through a getter
  useRows(() => "account:tagz" as const);
  // @ts-expect-error a field is not a list
  useRows("account:owner.age");
}
