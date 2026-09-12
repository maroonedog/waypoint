// ===========================================================================
// use-field-value.ts — one field's value, and nothing else.
//
// A component that only mirrors a value has no reason to be woken when the
// error on that field moves. Subscribing to the one channel it reads is what
// keeps a live summary from re-rendering every time validation runs.
//
// One value, so one PLACE: it goes through the same field handle `useField`
// does, and that handle refuses a rule. The column reading of a wildcard is
// `useFieldValues`.
// ===========================================================================
import type {
  ConcretePath,
  DeclaredOf,
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
  ValueOfPath,
  ValuesFor,
} from "./form-type-registry.js";

export function useFieldValue<K extends ConcretePath<AnyPath>>(
  path: K & InhabitedPath<AnyValues, K>
): ValueOfPath<AnyValues, DeclaredOf<K>> | undefined;
export function useFieldValue<
  TKey extends FormKey,
  K extends ConcretePath<PathsFor<TKey>>,
>(
  key: TKey,
  path: K & InhabitedPath<ValuesFor<TKey>, K>
): ValueOfPath<ValuesFor<TKey>, DeclaredOf<K>> | undefined;
export function useFieldValue(first: string, second?: string): never {
  const [key, path] = splitFormArgs(first, second);
  const form = useFormHandle(key);
  return useCell(form.field(path).sources.value) as never;
}
