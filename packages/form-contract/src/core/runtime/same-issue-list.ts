// ===========================================================================
// same-issue-list.ts — content equality for one field's issues.
//
// Every pass produces fresh issue objects, so reference equality would report
// every field as changed on every keystroke and wake the whole form. Comparing
// content is what keeps an issue cell Object.is-stable when the verdict did
// not actually move.
// ===========================================================================
import type { FormIssue } from "../../contract/index.js";

export function sameIssueList(
  left: readonly FormIssue[],
  right: readonly FormIssue[]
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let at = 0; at < left.length; at += 1) {
    const one = left[at];
    const other = right[at];
    if (one === undefined || other === undefined) return false;
    if (
      one.path !== other.path ||
      one.message !== other.message ||
      one.code !== other.code ||
      one.severity !== other.severity
    ) {
      return false;
    }
  }
  return true;
}
