// ===========================================================================
// zod-issues-to-form-issues.ts
//
// zod's severity is always an error — it has no warning level — so severity is
// omitted rather than filled in with a value zod never expressed.
// ===========================================================================
import type { FormIssue } from "form-contract";
import { formatIssuePath } from "./format-issue-path.js";

/** One zod issue, as much of it as is read here. */
export interface ZodIssueShape {
  readonly code?: string;
  readonly message: string;
  readonly path: readonly (string | number | symbol)[];
}

export function zodIssuesToFormIssues(
  issues: readonly ZodIssueShape[]
): readonly FormIssue[] {
  return issues.map((issue) =>
    issue.code === undefined
      ? { path: formatIssuePath(issue.path), message: issue.message }
      : {
          path: formatIssuePath(issue.path),
          message: issue.message,
          code: issue.code,
        }
  );
}
