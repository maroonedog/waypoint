import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const packageSource = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

// The packages resolve to their SOURCE, so editing the runtime reloads the
// page with no build step in between.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5179, strictPort: true },
  resolve: {
    alias: {
      "form-contract": packageSource("spec"),
      "form-contract-resolver-zod": packageSource("resolver-zod"),
      "form-core": packageSource("form-core"),
      "form-react": packageSource("form-react"),
      "form-store-zustand": packageSource("form-store-zustand"),
    },
  },
});
