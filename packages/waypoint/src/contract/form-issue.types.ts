// ===========================================================================
// form-issue.types.ts — one thing wrong with one path.
//
// `path` and `message` are required because a renderer has nothing to do
// without both: it must know which field to mark and what to say. `code` and
// `severity` are optional because a vendor that has no notion of either
// should omit them rather than invent one, and a renderer that branches on
// them has to handle their absence anyway.
//
// The path is concrete — `items[2].quantity`, never `items[*].quantity`. A
// wildcard describes the shape; an issue is about one value.
// ===========================================================================

export type FormIssueSeverity = "error" | "warning";

/**
 * One issue, addressed at the concrete path it belongs to.
 *
 * `TCode` IS WHAT THE VENDOR CAN NAME. It defaults to `string`, so nothing
 * that does not care has to say anything; a resolver that knows its vendor's
 * codes states them, and a wording function keyed on `issue.code` is then
 * checked and can be made exhaustive. `resolver-standard` states `never`,
 * which is not pedantry: the spec's issue has `message` and `path` and
 * nothing else, so a caller matching a code against the generic resolver is
 * matching something that never arrives — and `never` is how the compiler
 * says so instead of the code being `undefined` at run time and the branch
 * silently never taken.
 */
export interface FormIssue<TCode extends string = string> {
  readonly path: string;
  readonly message: string;
  readonly code?: TCode;
  readonly severity?: FormIssueSeverity;
}
