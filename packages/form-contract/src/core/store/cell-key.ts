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
import type { FormIssue } from "../../contract/index.js";

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
 * The issues behind that count, as a list rather than a length.
 *
 * It is the SAME list `errorCountCell` is the length of — one call writes both
 * — so a reader that wants to NAME what blocked does not re-derive it from the
 * per-path cells. Re-deriving is not merely wasteful, it is wrong twice over: a
 * store has no iteration, so nothing can enumerate the per-path cells; and an
 * issue on a path no descriptor declares has no cell to be found in.
 *
 * Both cells exist because they move at different rates. A count is
 * Object.is-stable while the wording changes, so a button disabled on the count
 * is not woken when a message is rephrased. A summary needs the wording, and
 * subscribes here instead.
 */
export const blockingIssuesCell = "form:blockingIssues" as CellKey<
  readonly FormIssue[]
>;

/**
 * The row ORDER of an array, as opaque ids. It changes when a row is inserted,
 * removed or moved, and never when a member of a row is edited — which is what
 * lets a list re-key without every input in it re-rendering.
 */
export const rowsCell = (arrayPath: string): CellKey<readonly string[]> =>
  mint<readonly string[]>("rows", arrayPath);

/**
 * Whether a field takes part in whether the form can be submitted. It defaults
 * to true, so a field nobody has said anything about blocks in the ordinary
 * way, and a subtree switched off keeps its VALUES — only its verdict stops
 * counting.
 */
export const participatingCell = (path: string): CellKey<boolean> =>
  mint<boolean>("participating", path);

export const submittingCell = "form:submitting" as CellKey<boolean>;
export const submitCountCell = "form:submitCount" as CellKey<number>;
export const validatingCell = "form:validating" as CellKey<boolean>;
