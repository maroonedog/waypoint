// ===========================================================================
// cell-key.ts — the channel spelling, and the only cast in the package.
//
// A key is a channel prefix and a path. Minting them here is what lets the
// store stay ignorant of paths: every other module asks for a key by meaning
// rather than by spelling, so the spelling can change without touching them.
//
// The prefix is separated by a colon and the path may itself contain colons;
// nothing ever parses a key back apart, so no escaping is needed.
// ===========================================================================
import type { CellKey } from "./form-cell-store.types.js";
import type { FormIssue } from "form-contract";

/** The whole form value, so a validator can be handed a complete root. */
export const ROOT_CELL = "root:" as CellKey<unknown>;

const mint = <T,>(channel: string, path: string): CellKey<T> =>
  // The phantom has no runtime witness, so the cast is how a key is made. It
  // is confined to this file for that reason.
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
