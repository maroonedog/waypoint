import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const packageSource = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

// The packages are resolved to their SOURCE rather than their build output, so
// editing the runtime reloads the page without a build step in between.
export default defineConfig({
  plugins: [react()],
  server: { port: 5178, strictPort: true },
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
