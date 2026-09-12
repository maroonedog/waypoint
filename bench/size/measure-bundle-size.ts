// ===========================================================================
// measure-bundle-size.ts — what each package costs an application, in bytes.
//
// The repository claims `sideEffects: false` on all five packages and sells
// itself partly on doing less work. It had never measured what it weighs, and
// an unmeasured size claim is the same kind of sentence this project refuses
// everywhere else.
//
// Measured the way an application would get it: esbuild bundles the package's
// public entry as ESM with React and the validator marked external, minifies,
// and the result is gzipped. Externals are excluded because they are the
// application's cost either way — counting React would make every number say
// the same thing.
//
// A SECOND figure per package, and it is the more honest one: the entry a
// screen actually reaches for. Importing `useField` should not cost what
// importing everything costs, and `sideEffects: false` is the claim that it
// does not. Both are recorded, so the gap between them is visible.
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

/**
 * The whole barrel, and then the handful of names a screen imports. The second
 * is what `sideEffects: false` is promising; recording only the first would
 * measure a claim nobody makes.
 */
const SUBJECTS: readonly (readonly [string, string])[] = [
  ["form-contract", `export * from "form-contract";`],
  ["form-core", `export * from "form-core";`],
  ["form-react", `export * from "form-react";`],
  ["form-contract-resolver-zod", `export * from "form-contract-resolver-zod";`],
  ["form-contract-resolver-luq", `export * from "form-contract-resolver-luq";`],
  ["form-store-zustand", `export * from "form-store-zustand";`],
  [
    "form-react (a screen: useField, useRows, FormProvider, useCreateForm)",
    `export { useField, useRows, FormProvider, useCreateForm } from "form-react";`,
  ],
  [
    "form-core (createForm alone)",
    `export { createForm } from "form-core";`,
  ],
];

export async function measureBundleSize(): Promise<readonly SizeRow[]> {
  const rows: SizeRow[] = [];
  for (const [id, contents] of SUBJECTS) rows.push(await measure(id, contents));
  return rows;
}
