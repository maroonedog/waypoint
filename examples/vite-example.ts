// ===========================================================================
// vite-example.ts — what every example in this directory needs from Vite.
//
// The alias table was copied into each example's own config and had already
// started to drift: one copy had six entry points, another five, and adding an
// entry point to the package meant remembering how many places to add it to.
// An example that is missing one does not fail to build — it resolves the
// specifier to the package's BUILT output instead, so it silently stops being
// a test of the source it is meant to exercise.
//
// The aliases are anchored regular expressions rather than bare strings, and
// that is not a style choice: Vite matches a string alias as a PREFIX, so a key
// of `@maroonedog/waypoint` would also swallow `@maroonedog/waypoint/react` and
// rewrite it to a path that does not exist. `^…$` makes each one match exactly
// the entry point it names.
//
// The example's root is not set here. It arrives as the last argument of
// `vite --config <this example's config> <this example's directory>`, which is
// how the scripts in package.json spell it.
// ===========================================================================
import { defineConfig, type PluginOption, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const PACKAGE = "@maroonedog/waypoint";

/** Source directory per entry point. The root entry lives in `contract`. */
const ENTRY_SOURCES = {
  [PACKAGE]: "contract",
  [`${PACKAGE}/core`]: "core",
  [`${PACKAGE}/react`]: "react",
  [`${PACKAGE}/resolver-standard`]: "resolver-standard",
  [`${PACKAGE}/resolver-zod`]: "resolver-zod",
  [`${PACKAGE}/resolver-luq`]: "resolver-luq",
  [`${PACKAGE}/store-zustand`]: "store-zustand",
} as const;

// The package resolves to its SOURCE rather than its build output, so editing
// the runtime reloads the page with no build step in between.
const entryAliases = Object.entries(ENTRY_SOURCES).map(
  ([specifier, directory]) => ({
    find: new RegExp(`^${specifier}$`),
    replacement: fileURLToPath(
      new URL(`../packages/waypoint/src/${directory}/index.ts`, import.meta.url)
    ),
  })
);

export interface ExampleOptions {
  /** Fixed, so the README and .claude/launch.json can name one address. */
  readonly port: number;
  /** Anything this example needs on top of React — Tailwind, for one. */
  readonly plugins?: readonly PluginOption[];
}

export function exampleConfig(options: ExampleOptions): UserConfig {
  return defineConfig({
    plugins: [react(), ...(options.plugins ?? [])],
    server: { port: options.port, strictPort: true },
    resolve: { alias: entryAliases },
  });
}
