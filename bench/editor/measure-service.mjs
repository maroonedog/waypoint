import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import ts from "typescript";
import { Session } from "node:inspector";
import { editorSources, probeSource } from "./workloads.mjs";

// Fail closed if the declaration changes: the counterfactual must remove only
// the identity member, not accidentally measure the current code twice.
export function withoutAdapterIdentity(source) {
  const member = /readonly \[adapterTypeIdentity\]\?:\s*\{\s*readonly values: T;\s*readonly paths: TPath;\s*\};/g;
  assert.equal([...source.matchAll(member)].length, 1, "identity member not uniquely found");
  return source.replace(member, "");
}

export function measureEditorService(workload, operation, variant, warmRepeats = 5, editRepeats = 6, profilePath) {
  assert.ok(["completion", "hover", "diagnostics"].includes(operation));
  assert.ok(["current", "without-identity", "before-guard"].includes(variant));
  const directory = mkdtempSync(fileURLToPath(new URL("../.editor-", import.meta.url)));
  const generated = editorSources(workload);
  const snapshots = new Map();
  const revisions = new Map();
  const rootFiles = [];
  let service;
  let profiler;
  let identityRewritten = false;
  let guardRewritten = false;
  const read = file => {
    let source = ts.sys.readFile(file);
    const normalized = file.replaceAll("\\", "/");
    if (source !== undefined && variant === "without-identity" && normalized.endsWith("/dist/contract/form-adapter.types.d.ts")) {
      source = withoutAdapterIdentity(source);
      identityRewritten = true;
    }
    if (source !== undefined && variant === "before-guard" && normalized.endsWith("/dist/react/use-field.d.ts")) {
      const original = "Q & NoInfer<InhabitedFormPath<Q>>";
      assert.equal(source.split(original).length, 2, "guard comparison no longer matches one emitted signature");
      source = source.replace(original, "Q & InhabitedFormPath<Q>");
      guardRewritten = true;
    }
    return source;
  };
  const options = {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true,
    exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    skipLibCheck: true, types: [], noEmit: true,
  };
  try {
    writeFileSync(join(directory, "package.json"), '{"type":"module","private":true}');
    const probe = join(directory, "probe.ts").replaceAll("\\", "/");
    const primary = generated.paths[0];
    const alternate = generated.paths[1];
    generated.files.set("probe.ts", probeSource(primary).source);
    for (const [name, source] of generated.files) {
      const file = join(directory, name).replaceAll("\\", "/");
      writeFileSync(file, source);
      rootFiles.push(file);
      snapshots.set(file, ts.ScriptSnapshot.fromString(source));
      revisions.set(file, 0);
    }
    const host = {
      getCompilationSettings: () => options,
      getScriptFileNames: () => rootFiles,
      getScriptVersion: file => String(revisions.get(file) ?? 0),
      getScriptSnapshot: file => {
        if (!snapshots.has(file)) {
          const source = read(file);
          if (source === undefined) return undefined;
          snapshots.set(file, ts.ScriptSnapshot.fromString(source));
        }
        return snapshots.get(file);
      },
      getCurrentDirectory: () => directory,
      getDefaultLibFileName: settings => ts.getDefaultLibFilePath(settings),
      fileExists: ts.sys.fileExists, readFile: read, readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };
    service = ts.createLanguageService(host);
    let active = probeSource(primary);
    const edit = path => {
      active = probeSource(path);
      snapshots.set(probe, ts.ScriptSnapshot.fromString(active.source));
      revisions.set(probe, revisions.get(probe) + 1);
    };
    const request = () => {
      if (operation === "completion") return service.getCompletionsAtPosition(probe, active.completionPosition, {});
      if (operation === "hover") return service.getQuickInfoAtPosition(probe, active.hoverPosition);
      return service.getSemanticDiagnostics(probe);
    };
    const evidence = [];
    const timed = invalid => {
      const started = performance.now();
      const result = request();
      const milliseconds = performance.now() - started;
      // Correctness checks are outside the stopwatch, but a fast empty answer
      // still fails the run instead of becoming a performance improvement.
      if (operation === "completion") {
        assert.ok(result?.entries.some(entry => entry.name === primary), "expected path absent from completions");
        assert.ok(result.entries.some(entry => entry.name === alternate), "alternate path absent from completions");
        evidence.push(result.entries.length);
      } else if (operation === "hover") {
        const display = ts.displayPartsToString(result?.displayParts);
        assert.match(display, /string \| undefined/);
        evidence.push(display);
      } else {
        assert.equal(result.length, invalid ? 1 : 0, ts.formatDiagnostics(result, {
          getCanonicalFileName: file => file, getCurrentDirectory: () => directory, getNewLine: () => "\n",
        }));
        if (invalid) assert.equal(result[0].code, 2345);
        evidence.push(result.map(diagnostic => diagnostic.code));
      }
      return milliseconds;
    };
    const coldMs = timed(false);
    const warmMs = Array.from({ length: warmRepeats }, () => timed(false));
    const editedMs = [];
    if (profilePath) {
      profiler = new Session();
      profiler.connect();
      profiler.post("Profiler.enable");
      profiler.post("Profiler.start");
    }
    for (let index = 0; index < editRepeats; index++) {
      const invalid = operation === "diagnostics" && index % 2 === 0;
      edit(invalid ? `${primary}Typo` : index % 2 === 0 ? alternate : primary);
      editedMs.push({ invalid, ms: timed(invalid) });
    }
    if (profiler) {
      let captured;
      profiler.post("Profiler.stop", (error, result) => {
        if (error) throw error;
        captured = result.profile;
      });
      assert.ok(captured, "Inspector did not synchronously return the profile");
      writeFileSync(profilePath, JSON.stringify(captured));
      profiler.disconnect();
      profiler = undefined;
    }
    // Samples are endpoints after measured requests, not peaks or post-GC values.
    const memory = process.memoryUsage();
    const program = service.getProgram();
    const sources = program.getSourceFiles().map(file => file.fileName.replaceAll("\\", "/"));
    const declarations = sources.filter(file => file.includes("/waypoint/dist/") && file.endsWith(".d.ts"));
    assert.ok(declarations.length > 0, "did not load waypoint declarations");
    assert.ok(!sources.some(file => file.includes("/waypoint/src/")), "source alias contaminated measurement");
    assert.equal(identityRewritten, variant === "without-identity");
    assert.equal(guardRewritten, variant === "before-guard");
    edit(primary);
    assert.deepEqual(service.getCompilerOptionsDiagnostics(), []);
    for (const file of rootFiles) {
      assert.equal(service.getSyntacticDiagnostics(file).length, 0, `syntax error in ${file}`);
      assert.equal(service.getSemanticDiagnostics(file).length, 0, `unexpected error in ${file}`);
    }
    // Refusing a typo is required even in a hover/completion measurement.
    edit(`${primary}Typo`);
    const rejected = service.getSemanticDiagnostics(probe);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].code, 2345);
    return {
      workload, operation, variant, typescript: ts.version, coldMs, warmMs, editedMs,
      heapUsedBytes: memory.heapUsed, rssBytes: memory.rss,
      applicationFiles: rootFiles.length, backgroundCalls: generated.paths.length,
      leavesPerForm: generated.leavesPerForm, declarationFiles: declarations.length,
      loadedFiles: sources.length, evidence,
    };
  } finally {
    profiler?.disconnect();
    service?.dispose();
    // This path comes directly from mkdtemp under this harness's directory.
    assert.equal(resolve(directory, ".."), fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""));
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const request = JSON.parse(process.argv[2]);
  const result = measureEditorService(request.workload, request.operation, request.variant, request.warmRepeats ?? 5, request.editRepeats ?? 6, request.profilePath);
  process.stdout.write(JSON.stringify(result));
}
