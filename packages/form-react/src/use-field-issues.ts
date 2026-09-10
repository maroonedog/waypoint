// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
// ===========================================================================
import type { FormIssue } from "form-contract";
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";
import { useFieldScope } from "./use-field-scope.js";
import { resolveScopedPath } from "./resolve-scoped-path.js";

export function useFieldIssues(localPath: string): readonly FormIssue[] {
  const form = useForm();
  const scope = useFieldScope();
  return useCell(form.field(resolveScopedPath(localPath, scope)).sources.issues);
}
