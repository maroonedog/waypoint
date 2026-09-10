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

/** One row, as a list renders it. */
export interface FieldRow {
  /** Opaque, stable for the life of the row: the React key and never an address. */
  readonly key: string;
  readonly index: number;
  /**
   * Where this row lives, concretely: `items[2]`. A row scope needs an address
   * of its own, because a prefix scope has one and a row scope that fell back
   * to the enclosing prefix would silently switch off the wrong subtree.
   */
  readonly path: string;
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

  // A row addresses itself; anything else addresses its prefix.
  const ownPath = row === undefined ? resolveScopedPath("", scope) : row.path;
  useParticipation(form, ownPath, participating);

  return (
    <FieldScopeContext.Provider value={scope}>
      {props.children}
    </FieldScopeContext.Provider>
  );
}
