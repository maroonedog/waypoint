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

export interface FieldRowsProps {
  readonly path: string;
  readonly children: (binding: RowsBinding) => ReactNode;
}

export function FieldRows(props: FieldRowsProps): ReactElement {
  const binding = useRows(props.path);
  return <>{props.children(binding)}</>;
}
