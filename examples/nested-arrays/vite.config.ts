// ===========================================================================
// vite.config.ts — the nested-arrays example, run against the package source.
//
// The aliases are anchored regular expressions rather than bare strings, and
// that is not a style choice: Vite matches a string alias as a PREFIX, so a
// key of `@maroonedog/form-contract` would also swallow
// `@maroonedog/form-contract/react` and rewrite it to a path that does not
// exist. `^…$` makes each one match exactly the entry point it names.
// ===========================================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const PACKAGE = "@maroonedog/form-contract";

/** One entry point of the package, as the source file behind it. */
const entrySource = (entry: string): string =>
  fileURLToPath(
    new URL(
      `../../packages/form-contract/src/${entry}/index.ts`,
      import.meta.url
    )
  );

const entryAliases = (
  [
    [PACKAGE, "contract"],
    [`${PACKAGE}/core`, "core"],
    [`${PACKAGE}/react`, "react"],
    [`${PACKAGE}/resolver-zod`, "resolver-zod"],
  ] as const
).map(([specifier, entry]) => ({
  find: new RegExp(`^${specifier}$`),
  replacement: entrySource(entry),
}));

export default defineConfig({
  plugins: [react()],
  server: { port: 5181, strictPort: true },
  resolve: { alias: entryAliases },
});
