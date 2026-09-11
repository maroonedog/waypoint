// ===========================================================================
// use-field-value.ts — one field's value, and nothing else.
//
// A component that only mirrors a value has no reason to be woken when the
// error on that field moves. Subscribing to the one channel it reads is what
// keeps a live summary from re-rendering every time validation runs.
// ===========================================================================
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";

export function useFieldValue<TValue>(path: string): TValue | undefined {
  const form = useForm();
  const source = form.field(path).sources.value;
  return useCell(source) as TValue | undefined;
}
