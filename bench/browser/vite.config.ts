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

const packageSource = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./page", import.meta.url)),
  resolve: {
    alias: {
      "form-contract": packageSource("spec"),
      "form-contract-resolver-zod": packageSource("resolver-zod"),
      "form-core": packageSource("form-core"),
      "form-react": packageSource("form-react"),
      "form-store-zustand": packageSource("form-store-zustand"),
    },
  },
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
