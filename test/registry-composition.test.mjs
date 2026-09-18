import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Real package boundaries, with declarations resolved through package exports.
// No paths alias: these consumers must exercise the declarations we ship.
test("independent packages compose through application-owned registration", () => {
  const directory = mkdtempSync(fileURLToPath(new URL(".registry-", import.meta.url)));
  const write = (path, content) => {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  const compile = (source, skipLibCheck = false, emit = false) => {
    write("consumer.ts", source);
    const program = ts.createProgram([join(directory, "consumer.ts")], {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true,
      skipLibCheck, types: [], noEmit: !emit, declaration: emit,
      emitDeclarationOnly: emit, outDir: join(directory, "emitted"),
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (emit && diagnostics.length === 0) program.emit();
    return diagnostics;
  };
  const clean = (source, skip = false, emit = false) => {
    const diagnostics = compile(source, skip, emit);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => directory, getCanonicalFileName: p => p,
      getNewLine: () => "\n",
    }));
  };
  const feature = (name, value) => {
    write(`node_modules/${name}/package.json`, JSON.stringify({
      name, type: "module", exports: { ".": "./index.d.ts", "./register": "./register.d.ts" },
    }));
    write(`node_modules/${name}/index.d.ts`, `
      import type { FormAdapter } from "@maroonedog/waypoint";
      export declare const adapter: FormAdapter<{ value: ${value} }, "value">;
    `);
    write(`node_modules/${name}/register.d.ts`, `
      import { adapter } from "./index.js";
      declare module "@maroonedog/waypoint" {
        interface WaypointForms { shared: typeof adapter }
      }
    `);
  };
  try {
    write("package.json", '{"type":"module"}');
    feature("feature-order", "string");
    feature("feature-stock", "number");
    clean(`
      import { adapter } from "feature-order";
      import { useField } from "@maroonedog/waypoint/react";
      void adapter;
      // @ts-expect-error importing an adapter must not register an application form
      useField("value");
    `);
    // A UI package can compile and emit without knowing any application's forms.
    clean(`
      import { createElement } from "react";
      import { useField, type FormPathTo } from "@maroonedog/waypoint/react";
      export function TextInput({ path }: { path: FormPathTo<string> }) {
        const field = useField(path);
        return createElement("input", field.inputProps);
      }
    `, false, true);
    const app = `
      import { adapter as order } from "feature-order";
      import { adapter as stock } from "feature-stock";
      import { TextInput } from "./emitted/consumer.js";
      import { useField } from "@maroonedog/waypoint/react";
      import type { FormAdapter } from "@maroonedog/waypoint";
      declare module "@maroonedog/waypoint" {
        interface WaypointForms { order: typeof order; stock: typeof stock }
      }
      const text: string | undefined = useField("order:value").value;
      const number: number | undefined = useField("stock:value").value;
      // @ts-expect-error structurally identical validation functions do not erase values
      const wrongAdapter: FormAdapter<{ value: number }, "value"> = order;
      // @ts-expect-error an adapter cannot be relabelled with different permitted paths
      const wrongPaths: FormAdapter<{ value: string }, "other"> = order;
      TextInput({ path: "order:value" });
      // @ts-expect-error a text control cannot address a numeric field
      TextInput({ path: "stock:value" });
      // @ts-expect-error two forms require qualification
      useField("value");
      // @ts-expect-error the package boundary must preserve typo rejection
      useField("order:vale");
      // @ts-expect-error values from different forms must not collapse to a union
      const wrong: string = useField("stock:value").value;
    `;
    clean(app);
    clean(app, true);
    // Characterize the hazard; this is not a promise that collisions are safe.
    const collision = `import "feature-order/register"; import "feature-stock/register";`;
    const diagnostics = compile(collision);
    assert.ok(diagnostics.some(d => d.code === 2717), JSON.stringify(diagnostics.map(d => ({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, " ") }))));
    clean(collision, true); // skipLibCheck hides incompatible dependency augmentations.
    clean(`
      import "feature-order/register";
      import { useField } from "@maroonedog/waypoint/react";
      const dependencyRegisteredThis: string | undefined = useField("shared:value").value;
    `);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
