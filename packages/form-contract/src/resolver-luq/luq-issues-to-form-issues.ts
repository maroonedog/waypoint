// ===========================================================================
// luq-issues-to-form-issues.ts — one verdict, re-addressed.
//
// luq already reports a dotted path — `owner.name`, `items[0].sku` — which is
// the spelling this contract uses, so nothing is rebuilt here and there is no
// segment-joining to get wrong. What this file does is narrow the shape and
// keep the code, because a code is what an application matches on when it
// wants to replace a message.
//
// A luq issue carries a severity. Only errors reach the form: a warning that
// blocked a submit would be a warning that is an error.
// ===========================================================================
import type { FormIssue } from "../contract/index.js";

/** Only what is read. A luq issue carries more than this. */
export interface LuqIssueShape {
  readonly path?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
  readonly severity?: unknown;
}

export function luqIssuesToFormIssues(
  issues: readonly LuqIssueShape[]
): readonly FormIssue[] {
  const produced: FormIssue[] = [];
  for (const issue of issues) {
    if (issue.severity !== undefined && issue.severity !== "error") continue;
    const path = typeof issue.path === "string" ? issue.path : "";
    const message =
      typeof issue.message === "string" ? issue.message : "This value is not acceptable.";
    produced.push(
      typeof issue.code === "string" ? { path, message, code: issue.code } : { path, message }
    );
  }
  return produced;
}
