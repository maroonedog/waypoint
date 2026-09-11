// ===========================================================================
// vite.config.ts — the documentation site.
//
// The same Tailwind v4 toolchain the showcase uses, so the site and the
// screen it documents are built by one pipeline and there is no second set of
// build dependencies to keep alive.
// ===========================================================================
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [tailwindcss()],
  server: { port: 5180, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
