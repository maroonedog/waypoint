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
// itself, running. The aliases point at the package's SOURCE, so the form a
// reader types into is built from the same files as the tests — a screenshot
// can go stale and a described behaviour can be wrong, and neither of those
// can happen to something the reader is operating.
// ===========================================================================
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { TRANSLATED, routeOf } from "./src/i18n/locales.mjs";

const PACKAGE = "@maroonedog/waypoint";

/**
 * One entry point of the package, as the source file behind it.
 *
 * @param {string} entry
 */
const entrySource = (entry) =>
  fileURLToPath(
    new URL(`../packages/waypoint/src/${entry}/index.ts`, import.meta.url)
  );

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

// Anchored regular expressions rather than bare strings: Vite matches a STRING
// alias as a prefix, so a `@maroonedog/waypoint` key would also swallow
// `@maroonedog/waypoint/react` and rewrite it to a path that is not
// there. zod keeps prefix matching on purpose — a subpath of it has to land in
// the same copy as the package itself.
const entryAliases = [
  ...(
    /** @type {readonly (readonly [string, string])[]} */ ([
      [PACKAGE, "contract"],
      [`${PACKAGE}/core`, "core"],
      [`${PACKAGE}/react`, "react"],
      [`${PACKAGE}/resolver-zod`, "resolver-zod"],
    ])
  ).map(([specifier, entry]) => ({
    find: new RegExp(`^${specifier}$`),
    replacement: entrySource(entry),
  })),
  { find: /^zod(?=$|\/)/, replacement: here("zod") },
];

export default defineConfig({
  // A PLACEHOLDER, and it has to be one: `@astrojs/sitemap` refuses to run
  // without `site`, and NO DOMAIN HAS BEEN CHOSEN. `formcontract.dev` was
  // never registered — it answered NXDOMAIN — and picking its replacement is
  // the author's call rather than this file's. So this names the address
  // GitHub Pages would serve from for the repository as it is actually named,
  // which is at least under the author's control. Whoever picks a domain
  // changes this line and puts `docs-site/public/CNAME` back; until then every
  // `og:url` and the sitemap name a page nobody is serving, and the README
  // says so rather than leaving a reader to find out.
  site: "https://maroonedog.github.io/waypoint",

  // ENGLISH IS CANONICAL AND JAPANESE IS A LAYER OVER IT, which is why the
  // default locale takes no prefix: `/api/` is the page and `/ja/api/` is the
  // same page in Japanese. `fallback` is deliberately NOT set — with it, a
  // route with no Japanese would quietly serve the English one under a
  // Japanese URL, and a reader who asked for Japanese and was given English
  // without being told has been misled. Every `/ja/` route is written by
  // hand, and the ones that are not translated yet say so in Japanese.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ja"],
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    react(),
    // The sitemap has to be told that two URLs are one page in two languages.
    // Without it they are listed as unrelated, and a search engine shows
    // whichever it happened to see first to everybody.
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", ja: "ja" } },
      // The integration assumes every locale has every page, which is how the
      // sitemap came to claim a Japanese alternate for all ten routes while
      // the pages themselves claimed it for two. A search engine takes the
      // sitemap's word for it, and would have handed a Japanese reader a
      // page that is a summary and a link. One list decides both — it is in
      // src/i18n/locales.mjs, which this file and the layout both read.
      serialize(item) {
        if (TRANSLATED.includes(routeOf(new URL(item.url).pathname))) return item;
        const { links, ...alone } = item;
        return alone;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: entryAliases,
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
