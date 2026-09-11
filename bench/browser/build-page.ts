// ===========================================================================
// build-page.ts — the bundle, rebuilt on every run.
//
// Rebuilt rather than cached: a stale bundle is a benchmark measuring code
// that is no longer in the repository, and nothing about the output would say
// so. The build is outside every measurement window, so what it costs is not
// in any figure.
// ===========================================================================
import { fileURLToPath } from "node:url";

export interface BuiltPage {
  readonly directory: string;
  readonly bytes: number;
}

export async function buildPage(): Promise<BuiltPage> {
  const { build } = await import("vite");
  const configFile = fileURLToPath(new URL("./vite.config.ts", import.meta.url));
  const output = await build({ configFile, mode: "production" });

  const directory = fileURLToPath(new URL("./dist", import.meta.url));
  const chunks = Array.isArray(output) ? output : [output];
  let bytes = 0;
  for (const held of chunks) {
    const written = (held as { output?: readonly { code?: string }[] }).output ?? [];
    for (const file of written) bytes += file.code?.length ?? 0;
  }
  return { directory, bytes };
}
