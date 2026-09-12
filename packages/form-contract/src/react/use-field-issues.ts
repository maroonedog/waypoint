// ===========================================================================
// use-field-issues.ts — one field's issues, and nothing else.
//
// A component that only reports errors has no reason to be woken when the
// value moves. Subscribing to the one channel it reads is what keeps typing in
// an input from re-rendering the summary beside it.
//
// One field's issues, so one PLACE. The issues a whole COLUMN carries are not
// this hook: every row's verdict is already on the form, and a summary that
// wants all of them reads `useFormStatus` rather than a wildcard here.
// ===========================================================================
import type {
  ConcretePath,
  FormIssue,
  InhabitedPath,
} from "../contract/index.js";
import { splitFormArgs } from "./split-form-args.js";
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type {
  AnyPath,
  AnyValues,
  FormKey,
  PathsFor,
  ValuesFor,
} from "./form-type-registry.js";

export function useFieldIssues<K extends ConcretePath<AnyPath>>(
  path: K & InhabitedPath<AnyValues, K>
): readonly FormIssue[];
export function useFieldIssues<
  TKey extends FormKey,
  K extends ConcretePath<PathsFor<TKey>>,
>(key: TKey, path: K & InhabitedPath<ValuesFor<TKey>, K>): readonly FormIssue[];
export function useFieldIssues(
  first: string,
  second?: string
): readonly FormIssue[] {
  const [key, path] = splitFormArgs(first, second);
  const form = useFormHandle(key);
  return useCell(form.field(path).sources.issues);
}
