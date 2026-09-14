import type { ReactElement, ReactNode } from "react";
import { useSectionSource, type SectionId } from "../section-source.js";

/** One MD3 filled card, used as a section of the form. */
export function SectionCard({
  title,
  caption,
  icon,
  actions,
  sourceId,
  children,
}: {
  title: string;
  caption?: string;
  icon: string;
  actions?: ReactNode;
  /**
   * Which section this is, for anything mounted around the form that wants to
   * put a control in the header. Nothing does by default — see
   * section-source.tsx.
   */
  sourceId?: SectionId;
  children: ReactNode;
}): ReactElement {
  const source = useSectionSource(sourceId);
  return (
    <section className="rounded-lg bg-surface-low p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        {/* The icon sits in its own span. A Material Symbols ligature does not
            form inside a flex container, so the box and the glyph cannot be
            the same element. */}
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
        >
          <span className="material-symbols-rounded text-[20px]">{icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium text-on-surface">{title}</h2>
          {caption === undefined ? null : (
            <p className="mt-0.5 text-sm text-on-surface-variant">{caption}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="shrink-0">{actions}</div>
        )}
        {source === null ? null : <div className="shrink-0">{source}</div>}
      </header>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">{children}</div>
    </section>
  );
}
