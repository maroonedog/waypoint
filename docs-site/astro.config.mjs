// @ts-check
// ===========================================================================
// astro.config.mjs — the documentation site.
//
// Tailwind arrives through `@tailwindcss/vite` rather than an Astro
// integration, because the Material Design 3 roles are declared with v4's
// `@theme inline` in a token file the showcase also imports. One token file,
// two consumers: the page documenting the library and the screen built with
// it cannot drift into different colour ramps.
// ===========================================================================
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://formcontract.dev",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 5180 },
  build: {
    // A documentation URL outlives the generator that produced it. Directory
    // output keeps /benchmark working rather than /benchmark.html.
    format: "directory",
  },
});
