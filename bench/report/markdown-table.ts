// ===========================================================================
// markdown-table.ts — one table writer, so two renderers cannot come to
// disagree about what a table looks like halfway down a report.
// ===========================================================================

export const code = (text: string): string => `\`${text}\``;

export const table = (
  header: readonly string[],
  rows: readonly string[][]
): string =>
  [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
