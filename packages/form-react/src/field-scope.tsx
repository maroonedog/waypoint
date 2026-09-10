// ===========================================================================
// field-scope.tsx — binds what is inside it to a place.
//
// The value is memoised on what it is made of. A context value with a new
// identity every render re-renders every consumer beneath it, which would
// undo per-cell subscription for everything inside a row.
// ===========================================================================
import { useMemo, type ReactElement, type ReactNode } from "react";
import {
  FieldScopeContext,
  type FieldScopeValue,
} from "./field-scope-context.js";
import { useFieldScope } from "./use-field-scope.js";
import { useForm } from "./use-form.js";
import { useParticipation } from "./use-participation.js";
import { resolveScopedPath } from "./resolve-scoped-path.js";

/** One row, as a list renders it: an opaque key and the index it sits at. */
export interface FieldRow {
  readonly key: string;
  readonly index: number;
}

export interface FieldScopeProps {
  /** A path local names hang from, joined onto any enclosing prefix. */
  readonly prefix?: string;
  /** The row everything inside belongs to. */
  readonly row?: FieldRow;
  /**
   * Whether everything inside blocks a submit. The values stay in the store
   * either way, so a rule that compares against this subtree goes on reading
   * it; what stops is its verdict counting.
   */
  readonly participating?: boolean;
  readonly children: ReactNode;
}

export function FieldScope(props: FieldScopeProps): ReactElement {
  const enclosing = useFieldScope();
  const form = useForm();
  const { prefix, row, participating } = props;
  const rowIndex = row?.index;

  const scope = useMemo<FieldScopeValue>(
    () => ({
      prefix:
        prefix === undefined || prefix === ""
          ? enclosing.prefix
          : enclosing.prefix === ""
            ? prefix
            : `${enclosing.prefix}.${prefix}`,
      indices:
        rowIndex === undefined
          ? enclosing.indices
          : [...enclosing.indices, rowIndex],
    }),
    [enclosing, prefix, rowIndex]
  );

  useParticipation(form, resolveScopedPath("", scope), participating);

  return (
    <FieldScopeContext.Provider value={scope}>
      {props.children}
    </FieldScopeContext.Provider>
  );
}
