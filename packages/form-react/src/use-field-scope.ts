// ===========================================================================
// use-field-scope.ts — the scope this component is rendered in.
//
// The default is the root scope rather than an error, because a form with no
// groups and no rows should not have to wrap anything.
// ===========================================================================
import { useContext } from "react";
import {
  FieldScopeContext,
  type FieldScopeValue,
} from "./field-scope-context.js";

export function useFieldScope(): FieldScopeValue {
  return useContext(FieldScopeContext);
}
