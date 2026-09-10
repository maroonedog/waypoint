// ===========================================================================
// group-issues-by-path.ts
//
// A validator returns one flat list for the whole root; a field reads its own.
// Grouping once per pass costs one walk, where letting every field filter the
// list costs one walk per mounted field.
// ===========================================================================
import type { FormIssue } from "form-contract";

export function groupIssuesByPath(
  issues: readonly FormIssue[]
): ReadonlyMap<string, readonly FormIssue[]> {
  const byPath = new Map<string, FormIssue[]>();
  for (const issue of issues) {
    const existing = byPath.get(issue.path);
    if (existing === undefined) byPath.set(issue.path, [issue]);
    else existing.push(issue);
  }
  return byPath;
}
