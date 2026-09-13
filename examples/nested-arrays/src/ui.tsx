// ===========================================================================
// ui.tsx — the markup every implementation shares.
//
// Identical chrome for all four, so what differs on the screen is only what
// differs in the code that addresses the fields.
//
// THE NUMBERS IN EACH HEADING ARE DERIVED, NOT TYPED. Each panel hands this
// its own source text — Vite's `?raw` — and both figures are counted here.
// They were hand-written once and they were wrong, including the one for the
// library this example belongs to. A comparison whose own row drifts is a
// comparison the reader stops trusting, and nothing was there to catch it,
// because a number in a string has nothing to run against it.
//
// COUNTED HERE RATHER THAN IN EACH PANEL, which is the same argument one step
// down: the word being counted appears in this file and in none of theirs, so
// counting it does not change what is counted.
// ===========================================================================
import type { ReactNode } from "react";

/** What a field two levels inside a list keeps having to say. */
const TERM = "shipments";

/** Non-blank lines that are not whole-line comments, and mentions of TERM. */
function countedFrom(source: string): string {
  const code = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"));
  const mentions = code.join("\n").split(TERM).length - 1;
  return `${code.length} lines / ${mentions}× "${TERM}"`;
}

export function Row({
  label,
  error,
  children,
}: {
  readonly label: string;
  readonly error?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <label className="lbl">
      <span>{label}</span>
      {children}
      <em>{error ?? ""}</em>
    </label>
  );
}

export function Panel({
  title,
  source,
  children,
}: {
  readonly title: string;
  /** This panel's own file, imported with `?raw`. Counted, never quoted. */
  readonly source: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>
        {title} <small>{countedFrom(source)}</small>
      </h2>
      {children}
    </section>
  );
}
