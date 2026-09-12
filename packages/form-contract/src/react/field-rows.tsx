// ===========================================================================
// field-rows.tsx — a list, drawn by its caller.
//
// It renders no wrapper and no button. What a row looks like, where the add
// control goes and whether a row can be removed at all are decisions this
// library has no business making, so all it supplies is the order and the
// three edits.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { ConcretePath } from "../contract/index.js";
import { useRows, type RowsBinding } from "./use-rows.js";
import type { AnyPath, ArrayPath } from "./form-type-registry.js";

export interface FieldRowsProps<K extends ConcretePath<ArrayPath<AnyPath>>> {
  /**
   * The one list this draws, concretely. A list nested in a row is reached
   * through the outer row's own address — `` `${row.path}.lines` `` — because
   * `shipments[*].lines` is as many row orders as there are shipments.
   */
  readonly path: K;
  readonly children: (binding: RowsBinding<K>) => ReactNode;
}

export function FieldRows<K extends ConcretePath<ArrayPath<AnyPath>>>(
  props: FieldRowsProps<K>
): ReactElement {
  const binding = useRows(props.path);
  return <>{props.children(binding)}</>;
}
