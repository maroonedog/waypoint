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
// ===========================================================================
import type { AddressablePath } from "form-contract";
import { splitFormArgs } from "./split-form-args.js";
import { useCell } from "./use-cell.js";
import { useFormHandle } from "./use-form.js";
import type { FieldRow } from "./field-row.types.js";
import type {
  AnyPath,
  ArrayPath,
  FormKey,
  PathsFor,
} from "./form-type-registry.js";

export interface RowsBinding<TPath extends string = string> {
  /** The concrete path this list lives at. */
  readonly path: TPath;
  readonly rows: readonly FieldRow<TPath>[];
  insert(at: number, value?: unknown): void;
  remove(at: number): void;
  move(from: number, to: number): void;
}

export function useRows<K extends AddressablePath<ArrayPath<AnyPath>>>(
  path: K
): RowsBinding<K>;
export function useRows<
  TKey extends FormKey,
  K extends AddressablePath<ArrayPath<PathsFor<TKey>>>,
>(key: TKey, path: K): RowsBinding<K>;
export function useRows(first: string, second?: string): RowsBinding<string> {
  const [formKey, path] = splitFormArgs(first, second);
  const form = useFormHandle(formKey);
  const handle = form.rows(path);
  const ids = useCell(handle.ids);

  return {
    path,
    rows: ids.map((key, index) => ({
      key,
      index,
      path: `${path}[${index}]` as `${string}[${number}]`,
    })),
    insert: (at, value) => handle.insert(at, value),
    remove: (at) => handle.remove(at),
    move: (from, to) => handle.move(from, to),
  };
}
