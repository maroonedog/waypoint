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
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "../contract/index.js";

export function useFieldValue<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>
): ValueAtFormPath<Q> | undefined;
export function useFieldValue(spelling: string): never {
  const { form, path } = useFormForPath(spelling);
  return useCell(form.field(path).sources.value) as never;
}
