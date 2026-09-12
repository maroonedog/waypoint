// ===========================================================================
// vite.config.ts — the playground, run against the package's source.
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

// The package resolves to its SOURCE rather than its build output, so editing
// the runtime reloads the page without a build step in between.
const entryAliases = (
  [
    [PACKAGE, "contract"],
    [`${PACKAGE}/core`, "core"],
    [`${PACKAGE}/react`, "react"],
    [`${PACKAGE}/resolver-zod`, "resolver-zod"],
    [`${PACKAGE}/store-zustand`, "store-zustand"],
  ] as const
).map(([specifier, entry]) => ({
  find: new RegExp(`^${specifier}$`),
  replacement: entrySource(entry),
}));

export default defineConfig({
  plugins: [react()],
  server: { port: 5178, strictPort: true },
  resolve: { alias: entryAliases },
});
