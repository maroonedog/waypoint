// ===========================================================================
// standard-issues-to-form-issues.ts — a Standard Schema verdict, re-addressed.
//
// NO `code`, AND THAT IS THE SPEC'S DOING. `StandardSchemaV1.Issue` has two
// members, `message` and `path`; `code` is not one of them. Vendors do return
// something like it, but not under one name and not always at all, so reading
// any particular spelling here would put one vendor's vocabulary into the
// generic path and quietly return nothing for the rest. A vendor whose codes a
// form needs keeps its own resolver, which is the whole reason luq still has
// one — luq's own bridge drops `code` on the way into the spec, so the generic
// path could not recover it even if this file tried.
//
// NO `severity` either, for the same reason and with a milder consequence: the
// spec has no notion of a warning, so every issue it carries is blocking, and
// omitting the member says that more honestly than writing "error" onto a
// verdict the vendor never graded.
//
// A missing message is replaced rather than dropped. An issue with no text is
// still a field that must not submit, and a renderer needs something to show.
// ===========================================================================
import { isPending, type FormIssue, type MaybeAsync } from "../contract/index.js";
import { formatIssuePath } from "./format-issue-path.js";
import type { StandardIssue, StandardResult } from "./standard-schema.types.js";

/** Shown when a vendor reported an issue and no text for it. */
const UNSTATED_MESSAGE = "This value is not acceptable.";

export function standardIssuesToFormIssues(
  issues: readonly StandardIssue[]
): readonly FormIssue[] {
  return issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message:
      typeof issue.message === "string" && issue.message !== ""
        ? issue.message
        : UNSTATED_MESSAGE,
  }));
}

/**
 * The verdict as the form runtime reads it. A result with no `issues` member
 * is the spec's spelling of success, so it becomes the empty list rather than
 * anything a caller has to test for.
 */
export function standardResultToFormIssues(
  result: StandardResult
): readonly FormIssue[] {
  const issues = result.issues;
  return issues === undefined ? [] : standardIssuesToFormIssues(issues);
}

/**
 * The verdict, mapped whether it has settled or not.
 *
 * `~standard.validate` is allowed to return a promise and several vendors do,
 * so every caller of it has this branch. It lives here once because the two
 * vendor resolvers map the same verdict differently — they read a `code` the
 * spec has no member for — and the thing they must NOT differ about is which
 * of them remembers that an answer can arrive late.
 *
 * A promise is passed on as a promise rather than awaited. `FormAdapter`'s
 * `validate` is `MaybeAsync`, and the scheduler numbers its passes so a late
 * verdict is dropped rather than written over a newer one; a vendor that
 * judges synchronously stays synchronous end to end, which is the whole reason
 * `MaybeAsync` is a union and not a promise.
 */
export function mapStandardVerdict(
  outcome: StandardResult | Promise<StandardResult>,
  toFormIssues: (result: StandardResult) => readonly FormIssue[]
): MaybeAsync<readonly FormIssue[]> {
  return isPending(outcome)
    ? outcome.then(toFormIssues)
    : toFormIssues(outcome);
}
