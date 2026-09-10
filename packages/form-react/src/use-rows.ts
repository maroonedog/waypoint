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
// ===========================================================================
import { useCell } from "./use-cell.js";
import { useForm } from "./use-form.js";
import { useFieldScope } from "./use-field-scope.js";
import { resolveScopedPath } from "./resolve-scoped-path.js";
import type { FieldRow } from "./field-scope.js";

export interface RowsBinding {
  /** The concrete path this list lives at. */
  readonly path: string;
  readonly rows: readonly FieldRow[];
  insert(at: number, value?: unknown): void;
  remove(at: number): void;
  move(from: number, to: number): void;
}

export function useRows(localPath: string): RowsBinding {
  const form = useForm();
  const scope = useFieldScope();
  const path = resolveScopedPath(localPath, scope);
  const handle = form.rows(path);
  const ids = useCell(handle.ids);

  return {
    path,
    rows: ids.map((key, index) => ({ key, index })),
    insert: (at, value) => handle.insert(at, value),
    remove: (at) => handle.remove(at),
    move: (from, to) => handle.move(from, to),
  };
}
