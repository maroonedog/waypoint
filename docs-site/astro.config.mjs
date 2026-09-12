// @ts-check
// ===========================================================================
// astro.config.mjs — the documentation site.
//
// Tailwind arrives through `@tailwindcss/vite` rather than an Astro
// integration, because the Material Design 3 roles are declared with v4's
// `@theme inline` in a token file the showcase also imports. One token file,
// two consumers: the page documenting the library and the screen built with
// it cannot drift into different colour ramps.
//
// React is here for one reason: the live demo on this site is the library
// itself, running. The aliases point at the packages' SOURCE, so the form a
// reader types into is built from the same files as the tests — a screenshot
// can go stale and a described behaviour can be wrong, and neither of those
// can happen to something the reader is operating.
// ===========================================================================
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

/** @param {string} name */
const packageSource = (name) =>
  fileURLToPath(new URL(`../packages/${name}/src/index.ts`, import.meta.url));

// The package sources resolve `zod` and `react` from the repository root when
// one is installed there, and this directory installs its own — two copies,
// two type identities, and `zodFormResolver(schema)` stops type-checking with
// a message about missing members that names no version. CI installs only this
// directory, so this one is the copy that must win.
//
// Measured, not assumed: before this, `astro check` reported nine errors here
// and every one of them was the second copy.
/** @param {string} name */
const here = (name) =>
  fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));

export default defineConfig({
  site: "https://formcontract.dev",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "form-contract": packageSource("spec"),
        "form-contract-resolver-zod": packageSource("resolver-zod"),
        "form-core": packageSource("form-core"),
        "form-react": packageSource("form-react"),
        zod: here("zod"),
      },
      // React is deduped rather than aliased. Aliasing it to a directory makes
      // Vite load react/index.js — CommonJS — straight into the SSR runner,
      // which dies on `module is not defined` before a page renders. `dedupe`
      // is the mechanism for "there must be exactly one of these", and it
      // resolves through the package's exports map like any other import.
      dedupe: ["react", "react-dom"],
    },
    // The pages read the repository's own measurement artefacts — the CI-gated
    // counts baseline and, when a CI run has produced one, the timing summary.
    // Rendering from those rather than from retyped figures is what stops a
    // number on the website and a number in the report from disagreeing.
    server: { fs: { allow: [".."] } },
  },
  server: { port: 5180 },
  build: {
    // A documentation URL outlives the generator that produced it. Directory
    // output keeps /benchmark working rather than /benchmark.html.
    format: "directory",
  },
});
