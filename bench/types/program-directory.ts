// ===========================================================================
// program-directory.ts — one throwaway package, reused for every program.
//
// A directory per program would be tidier and would measure module resolution
// over and over; one directory whose `program.ts` is rewritten measures the
// types. Each compile is still a fresh `tsc` process, so nothing carries from
// one measurement to the next except the directory itself.
//
// The `node_modules` junction is how `react` resolves. The alternative was a
// `paths` entry per external package, which encodes @types layout in this file
// and goes stale silently; a junction makes node resolution behave exactly as
// it does in an application that installed these packages. It is torn down
// with `rmdirSync`, which removes the LINK rather than descending it. Node's
// recursive `rmSync` was tested and does not descend a junction either, so
// this ordering is belt-and-braces rather than the only thing standing between
// a sweep and the repository's own `node_modules` — but it costs nothing and
// the shell is not the only thing that might ever clean this directory up.
// ===========================================================================
import {
  existsSync,
  mkdtempSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = fileURLToPath(new URL("../..", import.meta.url));

const forwardSlashed = (path: string): string => path.split("\\").join("/");

export interface ProgramDirectory {
  /** Where `tsc -p` is pointed. */
  readonly tsconfigPath: string;
  putProgram(source: string): void;
  /** The path it could not remove, or undefined when nothing is left. */
  remove(): string | undefined;
}

/** Everything this file writes, so the teardown can name each one. */
const WRITTEN = ["program.ts", "tsconfig.json", "package.json"] as const;

/**
 * The compiler options are `test/types-source/tsconfig.json`'s, because that is
 * the configuration this repository already compiles its own source under. A
 * measurement taken under looser options would be a measurement of a
 * configuration nobody uses.
 */
const tsconfigFor = (directory: string): string => {
  const back = forwardSlashed(relative(directory, REPOSITORY));
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        lib: ["ES2020", "DOM"],
        jsx: "react-jsx",
        strict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        noEmit: true,
        skipLibCheck: true,
        // Nothing is pulled in globally, so the floor is lib.d.ts and the
        // @types packages the imports genuinely reach.
        types: [],
        baseUrl: ".",
        paths: {
          "form-contract": [`${back}/packages/spec/src/index.ts`],
          "form-core": [`${back}/packages/form-core/src/index.ts`],
          "form-react": [`${back}/packages/form-react/src/index.ts`],
        },
      },
      include: ["program.ts"],
    },
    null,
    2
  );
};

export function openProgramDirectory(): ProgramDirectory {
  const directory = mkdtempSync(join(tmpdir(), "form-contract-types-"));
  const linked = join(directory, "node_modules");
  symlinkSync(join(REPOSITORY, "node_modules"), linked, "junction");
  // NodeNext reads the nearest package.json to decide the module system, and
  // without one the generated ESM is reported as CommonJS under
  // verbatimModuleSyntax rather than compiled.
  writeFileSync(
    join(directory, "package.json"),
    `${JSON.stringify({ name: "form-contract-type-program", private: true, type: "module" }, null, 2)}\n`
  );
  writeFileSync(join(directory, "tsconfig.json"), `${tsconfigFor(directory)}\n`);

  return {
    tsconfigPath: forwardSlashed(join(directory, "tsconfig.json")),
    putProgram(source) {
      writeFileSync(join(directory, "program.ts"), source);
    },
    remove() {
      // The link first, and by name: `rmdirSync` removes a junction without
      // descending it. Guarded, because this runs in a `finally` — a throw
      // here would replace whatever the sweep was reporting with a cleanup
      // error, which is the worst possible trade.
      try {
        rmdirSync(linked);
      } catch {
        // Already gone, or held open. The report below says what was left.
      }
      // Then the three files this file wrote, individually. Naming them is
      // both narrower than a recursive delete and the only thing observed to
      // work everywhere: `rmSync(…, { recursive: true })` returns without
      // throwing and without deleting under some sandboxed shells, which is
      // how a run leaves litter nobody is told about.
      for (const name of WRITTEN) {
        const path = join(directory, name);
        if (existsSync(path)) unlinkSync(path);
      }
      try {
        rmdirSync(directory);
      } catch {
        return directory;
      }
      return undefined;
    },
  };
}
