// ===========================================================================
// measure-bundle-size.ts — what each entry point costs an application.
//
// The package claims `sideEffects: false` and sells itself partly on doing
// less work. It had never measured what it weighs, and an unmeasured size
// claim is the same kind of sentence this project refuses everywhere else.
//
// Measured the way an application would get it: esbuild bundles one entry
// point as ESM with React and the validator marked external, minifies, and the
// result is gzipped. Externals are excluded because they are the application's
// cost either way — counting React would make every number say the same thing.
//
// A SECOND figure per entry, and it is the more honest one: the handful of
// names a screen actually reaches for. Importing `useField` should not cost
// what importing everything costs, and `sideEffects: false` is the claim that
// it does not. Both are recorded, so the gap between them is visible.
//
// That second figure matters MORE now than it did as six packages, not less.
// Six separate installs made the barrel figure mean something on its own — you
// could decline a package. One install cannot be declined, so the only thing
// standing between a screen and the whole library is tree-shaking, and these
// are the rows that say whether it is working.
// ===========================================================================
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

export interface SizeRow {
  readonly id: string;
  readonly entry: string;
  /** Minified bytes of the bundle, excluding anything marked external. */
  readonly minified: number;
  /** The same bytes, gzipped — what the wire actually carries. */
  readonly gzipped: number;
}

const EXTERNAL = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "zod",
  "zustand",
  "@maroonedog/luq",
];

/** One bundle, measured from a source string so a subpath can be probed. */
async function measure(id: string, contents: string): Promise<SizeRow> {
  const result = await build({
    stdin: {
      contents,
      resolveDir: new URL("../../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"),
      loader: "ts",
    },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    external: EXTERNAL,
    write: false,
    legalComments: "none",
  });

  const output = result.outputFiles[0];
  if (output === undefined) throw new Error(`esbuild produced nothing for ${id}`);
  return {
    id,
    entry: contents.trim(),
    minified: output.contents.byteLength,
    gzipped: gzipSync(Buffer.from(output.contents)).byteLength,
  };
}

const PACKAGE = "@maroonedog/form-contract";

/**
 * Every barrel, then the handful of names a screen imports, then the two
 * entries an application really installs together. The barrels alone would
 * measure a claim nobody makes: nobody imports `*`, and since the collapse
 * nobody can decline an entry either.
 */
const SUBJECTS: readonly (readonly [string, string])[] = [
  [PACKAGE, `export * from "${PACKAGE}";`],
  [`${PACKAGE}/core`, `export * from "${PACKAGE}/core";`],
  [`${PACKAGE}/react`, `export * from "${PACKAGE}/react";`],
  [`${PACKAGE}/resolver-zod`, `export * from "${PACKAGE}/resolver-zod";`],
  [`${PACKAGE}/resolver-luq`, `export * from "${PACKAGE}/resolver-luq";`],
  [`${PACKAGE}/store-zustand`, `export * from "${PACKAGE}/store-zustand";`],
  [
    "react (a screen: useField, useRows, FormProvider, useCreateForm)",
    `export { useField, useRows, FormProvider, useCreateForm } from "${PACKAGE}/react";`,
  ],
  // The floor row. It is the one figure `sideEffects: false` is really
  // promising, and the one that would go quietly wrong first.
  ["react (useField alone)", `export { useField } from "${PACKAGE}/react";`],
  ["core (createForm alone)", `export { createForm } from "${PACKAGE}/core";`],
  [
    "core (assertFormStoreContract alone)",
    `export { assertFormStoreContract } from "${PACKAGE}/core";`,
  ],
  // What an application actually installs. This row could not exist while the
  // screen and the resolver were two packages that nobody measured together.
  [
    "a screen + resolver-zod (what an application installs)",
    `export { useField, useRows, FormProvider, useCreateForm } from "${PACKAGE}/react";\n` +
      `export { zodFormResolver } from "${PACKAGE}/resolver-zod";`,
  ],
];

export async function measureBundleSize(): Promise<readonly SizeRow[]> {
  const rows: SizeRow[] = [];
  for (const [id, contents] of SUBJECTS) rows.push(await measure(id, contents));
  return rows;
}
