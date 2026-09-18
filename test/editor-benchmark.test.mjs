import { test } from "node:test";
import assert from "node:assert/strict";
import { measureEditorService, withoutAdapterIdentity } from "../bench/editor/measure-service.mjs";
import { median } from "../bench/editor/report.mjs";

test("editor benchmark observes real paths, value types, errors and edited recovery", () => {
  const workload = { id: "correctness", forms: 2, depth: 2, callsPerFile: 3 };
  for (const operation of ["completion", "hover", "diagnostics"]) {
    const result = measureEditorService(workload, operation, "current", 1, 2);
    assert.ok(result.coldMs > 0);
    assert.equal(result.backgroundCalls, 18);
    assert.equal(result.applicationFiles, 9);
    assert.equal(result.editedMs.length, 2);
    assert.ok(result.declarationFiles > 0);
  }
  const counterfactual = measureEditorService(workload, "diagnostics", "without-identity", 1, 2);
  assert.deepEqual(counterfactual.evidence, [[], [], [2345], []]);
  const guarded = measureEditorService(workload, "completion", "before-guard", 1, 2);
  assert.ok(guarded.evidence.every(count => count > 0));
});

test("counterfactual refuses a changed declaration instead of silently becoming a no-op", () => {
  assert.throws(() => withoutAdapterIdentity("interface FormAdapter {}"), /not uniquely found/);
});

test("summary rejects missing measurements and uses the midpoint for even samples", () => {
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.throws(() => median([]));
  assert.throws(() => median([Number.NaN]));
});
