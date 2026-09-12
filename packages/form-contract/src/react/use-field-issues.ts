// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
// ===========================================================================
import type { AddressablePath, FormIssue } from "../contract/index.js";
import { splitFormArgs } from "./split-form-args.js";
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type { AnyPath, FormKey, PathsFor } from "./form-type-registry.js";

export function useFieldIssues(
  path: AddressablePath<AnyPath>
): readonly FormIssue[];
export function useFieldIssues<TKey extends FormKey>(
  key: TKey,
  path: AddressablePath<PathsFor<TKey>>
): readonly FormIssue[];
export function useFieldIssues(
  first: string,
  second?: string
): readonly FormIssue[] {
  const [key, path] = splitFormArgs(first, second);
  const form = useFormHandle(key);
  return useCell(form.field(path).sources.issues);
}
