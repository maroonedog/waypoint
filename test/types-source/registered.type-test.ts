// ===========================================================================
// registered.type-test.ts — the packages' own source, with a form registered.
//
// test/types compiles what the packages EMIT. A .d.ts has no implementation
// signatures in it, so an overload that does not match its own implementation
// compiles there and fails only for whoever builds from source — which is this
// repository's own documentation site, and nobody else, so it went unnoticed.
//
// It is not hypothetical: useForm's implementation returned
// `FormHandle<never, string>`, and a handle is invariant in its value type, so
// the keyless overload stopped matching the moment `AnyValues` was no longer
// `never`. That is to say: it compiled in every compilation that registered
// nothing, and failed in every one that registered a form.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { useField, useForm, useRows } from "@maroonedog/waypoint/react";

const orderAdapter = zodFormResolver(
  z.object({
    owner: z.object({ name: z.string() }),
    items: z.array(z.object({ sku: z.string() })),
  })
);

declare module "@maroonedog/waypoint/react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}

export function everySurface(): void {
  const form = useForm();
  void form.submit(() => undefined);
  useField("owner.name");
  useRows("items");
}
