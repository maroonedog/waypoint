// ===========================================================================
// use-rows.ts — the row order of one array, and the edits that change it.
//
// The subscription is to the ORDER alone. Editing a member of a row leaves the
// order untouched, so a list does not re-render because somebody typed in it.
//
// The row objects are built here rather than read from a cell. A reader handed
// to useSyncExternalStore must return the same reference when nothing moved,
// and a fresh object per row would make every snapshot differ from the last;
// building them in the hook body happens after that comparison, not during it.
//
// Which paths are lists is not a separate declaration: a list is declared as
// `items[*]`, so the lists are what is left when that suffix is removed. An
// inner list is reached by its concrete outer index — `shipments[0].lines` —
// which is exactly the address the outer row already handed down.
//
// CONCRETE, therefore, and the sentence above is why. One list has one row
// order, and `shipments[*].lines` names as many orders as there are shipments;
// `rows()` asserts as much before it does anything else. The type used to
// accept the wildcard and throw on it, which put the working spelling and the
// checking spelling on opposite sides.
// ===========================================================================
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

export function useRows<Q extends FormListPath>(path: Q): RowsBinding<Q>;
export function useRows(spelling: string): RowsBinding<string> {
  const { form, path } = useFormForPath(spelling);
  const handle = form.rows(path);
  const ids = useCell(handle.ids);

  return {
    // The QUALIFIED spelling, not the one the store was addressed with. A row
    // hands its address back to a path-taking surface — `` `${row.path}.sku` ``
    // — so it has to carry its form the way every other path does, or the
    // caller is threading a key beside it again.
    path: spelling,
    rows: ids.map((key, index) => ({
      key,
      index,
      path: `${spelling}[${index}]` as `${string}[${number}]`,
    })),
    insert: (at, value) => handle.insert(at, value),
    remove: (at) => handle.remove(at),
    move: (from, to) => handle.move(from, to),
  };
}
