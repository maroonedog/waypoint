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

/** One issue, addressed at the concrete path it belongs to. */
export interface FormIssue {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
  readonly severity?: FormIssueSeverity;
}
