// ===========================================================================
// field-rows.tsx — a list, drawn by its caller.
//
// It renders no wrapper and no button. What a row looks like, where the add
// control goes and whether a row can be removed at all are decisions this
// library has no business making, so all it supplies is the order and the
// three edits.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import { useRows, type RowsBinding } from "./use-rows.js";
import type { FormListPath } from "./form-type-registry.js";

export interface FieldRowsProps<Q extends FormListPath> {
  /**
   * The one list this draws, concretely, qualified by the form it belongs to.
   * A list nested in a row is reached through the outer row's own address —
   * `` `${row.path}.lines` `` — because `shipments[*].lines` is as many row
   * orders as there are shipments. That address arrives already qualified, so
   * the inner list needs nothing threaded alongside it.
   */
  readonly path: Q;
  readonly children: (binding: RowsBinding<Q>) => ReactNode;
}

export function FieldRows<Q extends FormListPath>(
  props: FieldRowsProps<Q>
): ReactElement {
  const binding = useRows(props.path);
  return <>{props.children(binding)}</>;
}
