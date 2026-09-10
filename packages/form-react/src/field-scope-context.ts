// ===========================================================================
// field-scope-context.ts — where a local name is, and which row it is in.
//
// A scope carries two independent things. The prefix lets a group be authored
// against local names and bound wherever it is placed, so the same component
// serves the billing address and the shipping one. The indices bind the
// wildcards of a declared path, outermost first, so nothing inside a row ever
// spells the row number.
//
// The two are separate because a group may be placed inside a row and a row
// may contain a group, and neither one implies the other.
// ===========================================================================
import { createContext } from "react";

export interface FieldScopeValue {
  /** The path a local name hangs from; empty at the top of the form. */
  readonly prefix: string;
  /** One index per enclosing row scope, outermost first. */
  readonly indices: readonly number[];
}

export const ROOT_SCOPE: FieldScopeValue = Object.freeze({
  prefix: "",
  indices: Object.freeze([]),
});

export const FieldScopeContext = createContext<FieldScopeValue>(ROOT_SCOPE);
