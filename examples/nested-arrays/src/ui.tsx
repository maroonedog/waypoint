// ===========================================================================
// ui.tsx — the markup every implementation shares.
//
// Identical chrome for all four, so what differs on the screen is only what
// differs in the code that addresses the fields.
// ===========================================================================
import type { ReactNode } from "react";

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
  note,
  children,
}: {
  readonly title: string;
  /** Measured, not estimated: see the README for how. */
  readonly note: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>
        {title} <small>{note}</small>
      </h2>
      {children}
    </section>
  );
}
