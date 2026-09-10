// ===========================================================================
// distribute-issues.ts — scatters one pass's verdict onto the paths it judged.
//
// Compute is proportional to the schema; notification is proportional to the
// paths whose issues actually moved. A pass over four hundred fields wakes
// only the fields whose errors changed.
//
// Paths that HAD issues are visited as well as paths that have them now, or a
// field whose error was just fixed would keep showing it: nothing would write
// its cell back to empty.
// ===========================================================================
import type { FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { issuesCell } from "../store/cell-key.js";
import { groupIssuesByPath } from "./group-issues-by-path.js";
import { sameIssueList } from "./same-issue-list.js";
import { NO_ISSUES } from "./interned-defaults.js";

/** Remembers which paths carried issues, so they can be cleared next pass. */
export interface IssuedPathRecord {
  readonly paths: Set<string>;
}

export const createIssuedPathRecord = (): IssuedPathRecord => ({
  paths: new Set<string>(),
});

/**
 * A dormant path is written as having no issues rather than skipped. Skipping
 * would leave whatever it last showed on screen, and the point of switching a
 * subtree off is that it stops reporting.
 */
export function distributeIssues(
  store: FormCellStore,
  record: IssuedPathRecord,
  produced: readonly FormIssue[],
  isParticipating: (path: string) => boolean = () => true
): void {
  const byPath = groupIssuesByPath(
    produced.filter((issue) => isParticipating(issue.path))
  );
  store.batch(() => {
    for (const previous of record.paths) {
      if (byPath.has(previous)) continue;
      const held = store.read(issuesCell(previous)) ?? NO_ISSUES;
      if (held.length !== 0) store.write(issuesCell(previous), NO_ISSUES);
    }
    for (const [path, issues] of byPath) {
      const held = store.read(issuesCell(path)) ?? NO_ISSUES;
      if (!sameIssueList(held, issues)) store.write(issuesCell(path), issues);
    }
  });
  record.paths.clear();
  for (const path of byPath.keys()) record.paths.add(path);
}

/**
 * Re-addresses the record after a structural edit moved issue cells behind its
 * back. Without this the record still names the old path, so the next pass
 * clears a cell nobody is reading and leaves the moved error on screen with
 * nothing left that will ever write it away.
 *
 * Collected before it is applied: one move's target can be another move's
 * source, and applying as it goes would drop a path that had just arrived.
 */
export function followIssuedPaths(
  record: IssuedPathRecord,
  moves: readonly { readonly source: string; readonly target: string | undefined }[]
): void {
  const removed = new Set<string>();
  const added = new Set<string>();
  for (const move of moves) {
    if (!record.paths.has(move.source)) continue;
    removed.add(move.source);
    if (move.target !== undefined) added.add(move.target);
  }
  for (const path of removed) record.paths.delete(path);
  for (const path of added) record.paths.add(path);
}
