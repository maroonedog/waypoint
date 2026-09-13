// The showcase screen, run against the package's source. See
// ../vite-example.ts. Tailwind is this example's alone: it is the only one
// that draws a designed interface, and the others must not pay for it.
import tailwindcss from "@tailwindcss/vite";
import { exampleConfig } from "../vite-example.js";

export default exampleConfig({ port: 5179, plugins: [tailwindcss()] });
