// ===========================================================================
// error-summary.type-test.ts — what a summary's entries are, in the type
// system, and the two absences a caller has to be told about at compile time.
//
// `label` is `string | undefined`, NOT `string`. That is the whole of the
// descriptor's refusal to invent a name from a path, carried out to the one
// place a renderer meets it: a caller writing `entry.label` into a `<button>`
// has to decide what an unlabelled field says, and the compiler makes them.
// Widening it to `string` with the path as a fallback would have put
// `items[0].sku` in front of the person this feature exists for, silently.
//
// `blockedBy` is a `CellSource`, the same shape `errorCount` is, so the two
// are subscribed to the same way and nothing has to learn a second mechanism.
//
// The `@ts-expect-error` lines are the test: each one fails to compile if the
// absence ever degrades to a certainty, because a `@ts-expect-error` with
// nothing to suppress is itself an error.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";
import { createForm, summarizeIssues } from "@maroonedog/form-contract/core";
import type { FormIssue } from "@maroonedog/form-contract";
import type {
  CellSource,
  FieldIssueSummary,
} from "@maroonedog/form-contract/core";
import { useErrorSummary } from "@maroonedog/form-contract/react";
import type { ErrorSummary } from "@maroonedog/form-contract/react";

const form = createForm({
  adapter: zodFormResolver(
    z.object({ name: z.string(), items: z.array(z.object({ sku: z.string() })) })
  ),
  defaultValues: { name: "", items: [] },
});

// The live list is a source, exactly as the count is.
const blocked: CellSource<readonly FormIssue[]> = form.blockedBy;
const counted: CellSource<number> = form.errorCount;
void blocked;
void counted;

// `summarizeIssues` takes the tree the handle already carries, so a caller
// never rebuilds it, and never has to reach for the flat descriptor list.
const summarized: readonly FieldIssueSummary[] = summarizeIssues({
  tree: form.tree,
  issues: form.blockedBy.read(),
});

const first = summarized[0];
if (first !== undefined) {
  const path: string = first.path;
  const message: string = first.message;
  const issues: readonly FormIssue[] = first.issues;
  void path;
  void message;
  void issues;

  // @ts-expect-error a label is absent when the schema declared none.
  const label: string = first.label;
  void label;
}

// The hook's entries are those summaries plus a way to reach the field.
function Summary(): void {
  const summary: ErrorSummary = useErrorSummary();
  const focused: boolean = summary.focusFirst();
  const region: boolean = summary.focusSummary();
  void focused;
  void region;

  for (const entry of summary.entries) {
    const went: boolean = entry.focus();
    void went;
    // @ts-expect-error the same absence survives into the hook's entries.
    const label: string = entry.label;
    void label;
  }

  // The region bag is the caller's to spread; the tab index is pinned so a
  // summary cannot silently join the tab order.
  const tabIndex: -1 = summary.summaryProps.tabIndex;
  void tabIndex;
}
void Summary;
