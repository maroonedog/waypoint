// ===========================================================================
// vite.config.ts — the showcase screen, run against the package's source.
//
// The aliases are anchored regular expressions rather than bare strings, and
// that is not a style choice: Vite matches a string alias as a PREFIX, so a
// key of `@maroonedog/waypoint` would also swallow
// `@maroonedog/waypoint/react` and rewrite it to a path that does not
// exist. `^…$` makes each one match exactly the entry point it names.
// ===========================================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const PACKAGE = "@maroonedog/waypoint";

/** One entry point of the package, as the source file behind it. */
const entrySource = (entry: string): string =>
  fileURLToPath(
    new URL(
      `../../packages/waypoint/src/${entry}/index.ts`,
      import.meta.url
    )
  );

// The package resolves to its SOURCE, so editing the runtime reloads the page
// with no build step in between.
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
  plugins: [react(), tailwindcss()],
  server: { port: 5179, strictPort: true },
  resolve: { alias: entryAliases },
});
