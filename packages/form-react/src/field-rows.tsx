// ===========================================================================
// field-rows.tsx — a list, drawn by its caller.
//
// It renders no wrapper and no button. What a row looks like, where the add
// control goes and whether a row can be removed at all are decisions this
// library has no business making, so all it supplies is the order and the
// three edits.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { AddressablePath } from "form-contract";
import { useRows, type RowsBinding } from "./use-rows.js";
import type { AnyPath, ArrayPath } from "./form-type-registry.js";

export interface FieldRowsProps<K extends AddressablePath<ArrayPath<AnyPath>>> {
  readonly path: K;
  readonly children: (binding: RowsBinding<K>) => ReactNode;
}

export function FieldRows<K extends AddressablePath<ArrayPath<AnyPath>>>(
  props: FieldRowsProps<K>
): ReactElement {
  const binding = useRows(props.path);
  return <>{props.children(binding)}</>;
}
