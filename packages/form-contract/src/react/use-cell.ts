// ===========================================================================
// use-cell.ts — the one useSyncExternalStore call site in the package.
//
// The third argument is always passed. React throws outright when a store is
// read during server rendering without one, and a cell reads identically on
// the server given the same seeding, so the server snapshot is the same
// function.
//
// There is no selector and no equality argument. The source's read returns an
// interned or primitive value, so the snapshot is Object.is-stable by
// construction and there is nothing left for an equality function to fix.
// ===========================================================================
import { useSyncExternalStore } from "react";
import type { CellSource } from "../core/index.js";

export function useCell<T>(source: CellSource<T>): T {
  return useSyncExternalStore(source.subscribe, source.read, source.read);
}
