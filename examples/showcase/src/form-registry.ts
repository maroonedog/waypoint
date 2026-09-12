// ===========================================================================
// form-registry.ts — this application's form, declared once.
//
// Nothing imports this for its types. A module augmentation belongs to the
// COMPILATION rather than to the import graph, so every component in this
// example is checked against these paths without being handed anything.
// ===========================================================================
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";
import { applicationSchema } from "./schema.js";

export const applicationAdapter = zodFormResolver(applicationSchema);

declare module "@maroonedog/form-contract/react" {
  interface FormTypeRegistry {
    form: typeof applicationAdapter;
  }
}
