// ===========================================================================
// cell-key.ts — how a key is spelled, decided in one place.
//
// A key is a channel prefix and a path. Minting them here is what lets the
// store stay ignorant of paths: a caller asks for a key by meaning rather than
// by spelling, so the spelling can change without any caller changing.
//
// The prefix is separated by a colon and the path may itself contain colons.
// Nothing here parses a key back apart, so the separator needs no escape.
// ===========================================================================
import type { CellKey } from "./form-cell-store.types.js";
import type { FormIssue } from "form-contract";

/** The whole form value, so a validator can be handed a complete root. */
export const ROOT_CELL = "root:" as CellKey<unknown>;

const mint = <T,>(channel: string, path: string): CellKey<T> =>
  // The phantom has no runtime witness, so making a key is a cast by
  // construction. Every mint goes through this one function so the assertion
  // is written once.
  `${channel}:${path}` as CellKey<T>;

export const valueCell = (path: string): CellKey<unknown> =>
  mint<unknown>("value", path);

export const issuesCell = (path: string): CellKey<readonly FormIssue[]> =>
  mint<readonly FormIssue[]>("issues", path);

export const touchedCell = (path: string): CellKey<boolean> =>
  mint<boolean>("touched", path);

export const dirtyCell = (path: string): CellKey<boolean> =>
  mint<boolean>("dirty", path);

export const errorCountCell = "form:errorCount" as CellKey<number>;

/**
 * The row ORDER of an array, as opaque ids. It changes when a row is inserted,
 * removed or moved, and never when a member of a row is edited — which is what
 * lets a list re-key without every input in it re-rendering.
 */
export const rowsCell = (arrayPath: string): CellKey<readonly string[]> =>
  mint<readonly string[]>("rows", arrayPath);
