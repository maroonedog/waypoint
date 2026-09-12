// ===========================================================================
// zod-issues-to-form-issues.ts — zod's verdict, keeping the one member the
// spec has no room for.
//
// `code` IS WHY THIS FILE EXISTS. `StandardSchemaV1.Issue` has exactly two
// members, `message` and `path` — read from zod's vendored copy of the spec —
// so the generic mapper cannot carry a code without inventing a member, and it
// does not. zod returns one anyway: run here on zod 4.6.1, the issues off
// `~standard.validate` are byte-identical to `safeParse`'s, `code:
// "too_small"` included. An application that replaces a message by matching
// its code needs that, and test/zod-resolver.test.mjs has asserted on it since
// before the generic path existed. So the vendor keeps the verdict, and this
// is the same reason resolver-luq keeps one.
//
// The path is NOT rebuilt here. `formatIssuePath` moved to
// `./resolver-standard` when it stopped being zod's, and it handles strictly
// more segment shapes than the zod-only version it replaced; a second copy
// spelling `items[2].sku` slightly differently is the defect this import
// prevents.
//
// zod's severity is always an error — it has no warning level — so severity is
// omitted rather than filled in with a value zod never expressed.
// ===========================================================================
import type { FormIssue } from "../contract/index.js";
import {
  formatIssuePath,
  type StandardResult,
} from "../resolver-standard/index.js";

/** One zod issue, as much of it as is read here. */
interface ZodIssueShape {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly path?: unknown;
}

/** The verdict, with zod's code kept on every issue that carries one. */
export function zodResultToFormIssues(
  result: StandardResult
): readonly FormIssue[] {
  const issues = result.issues;
  if (issues === undefined) return [];
  return (issues as readonly ZodIssueShape[]).map((issue) => {
    const path = formatIssuePath(issue.path);
    const message =
      typeof issue.message === "string" ? issue.message : "This value is not acceptable.";
    return typeof issue.code === "string"
      ? { path, message, code: issue.code }
      : { path, message };
  });
}
