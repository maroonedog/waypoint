// ===========================================================================
// form-contract-registration.ts — the benchmark's form, registered.
//
// Every hook in the `./react` entry reads its paths from the type registry,
// and this program's form has none to give: the schema is GENERATED, one leaf
// per field at whatever width the run asks for, so no type describes it and
// none could.
//
// Registering `FormAdapter<unknown, string>` says exactly that. The paths of
// this form are `string`, so `AddressablePath<string>` is `string` and the
// hooks stop checking — for this program only, by its own declaration, in one
// place a reader can find. That is the escape hatch for a schema nobody wrote
// down, and it is a line of the application's own source rather than a second
// API for everyone else to choose between.
// ===========================================================================
import type { FormAdapter } from "@maroonedog/form-contract";

declare module "@maroonedog/form-contract/react" {
  interface FormTypeRegistry {
    form: FormAdapter<unknown, string>;
  }
}

export {};
