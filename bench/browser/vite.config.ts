// ===========================================================================
// vite.config.ts — the browser lane builds the counts lane's own files.
//
// The entry pulls `bench/subjects/*.ts` and `bench/shape/*.ts` directly. There
// is no browser copy of a subject and no browser copy of the shared leaf, so
// the two lanes cannot come to disagree about what they are measuring by way
// of a file somebody updated once.
//
// It is a production build, not a dev server: a dev server ships unbundled
// modules and a development React, and both of those would be in every
// microsecond this lane prints.
// ===========================================================================
import { defineConfig } from "vite";
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

// Anchored regular expressions, because Vite matches a STRING alias as a
// prefix: a bare `@maroonedog/waypoint` key would also swallow
// `@maroonedog/waypoint/react` and rewrite it to a path that is not there.
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
  root: fileURLToPath(new URL("./page", import.meta.url)),
  resolve: { alias: entryAliases },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    // One file, so the measurement is not sitting behind a module waterfall,
    // and no minified-name mangling of what the trace attributes work to.
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
    target: "esnext",
    sourcemap: false,
  },
  logLevel: "warn",
});
