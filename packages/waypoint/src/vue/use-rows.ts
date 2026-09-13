// ===========================================================================
// use-rows.ts — the row order of one array, and the edits that change it.
//
// The subscription is to the ORDER alone. Editing a member of a row leaves the
// order untouched, so a list does not re-render because somebody typed in it.
//
// The row objects are built in the getter rather than read from a cell, so a
// `v-for` over them sees fresh objects only when the order actually moved.
//
// CONCRETE, and the reason is that one list has one row order:
// `shipments[*].lines` names as many orders as there are shipments, and
// `rows()` asserts as much before it does anything else. An inner list is
// reached by its outer row's concrete address — `shipments[0].lines` — which
// is exactly what the outer row already handed down.
// ===========================================================================
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import type { FieldRow } from "../dom/field-row.types.js";
import type { FormListPath } from "../contract/index.js";

export interface RowsBinding<TPath extends string = string> {
  /** Where this list lives, qualified by the form it belongs to. */
  readonly path: TPath;
  readonly rows: readonly FieldRow<TPath>[];
  insert(at: number, value?: unknown): void;
  remove(at: number): void;
  move(from: number, to: number): void;
}

export function useRows<Q extends FormListPath>(
  path: MaybeRefOrGetter<Q>
): RowsBinding<Q>;
export function useRows(
  spelling: MaybeRefOrGetter<string>
): RowsBinding<string> {
  const { form, path } = useFormForPath(spelling);
  const handle = computed(() => form.rows(path.value));
  const ids = useCell(() => handle.value.ids);
  const rows = computed(() =>
    ids.value.map((key, index) => ({
      key,
      index,
      // The QUALIFIED spelling, not the one the store was addressed with. A
      // row hands its address back to a path-taking surface —
      // `` `${row.path}.sku` `` — so it has to carry its form the way every
      // other path does, or the caller is threading a key beside it again.
      path: `${toValue(spelling)}[${index}]` as `${string}[${number}]`,
    }))
  );

  return {
    get path() {
      return toValue(spelling);
    },
    get rows() {
      return rows.value;
    },
    insert: (at, value) => handle.value.insert(at, value),
    remove: (at) => handle.value.remove(at),
    move: (from, to) => handle.value.move(from, to),
  };
}
