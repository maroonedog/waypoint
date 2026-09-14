// ===========================================================================
// section-source.tsx — a slot in each section's header, empty by default.
//
// The documentation site runs this example on its own page, and a reader
// there wants the code for the section they are looking at rather than the
// code for the application. That control has to sit inside the form, which
// means the form has to have somewhere to put it — and it must not mean the
// form carries a documentation feature around with it.
//
// So: a context whose default renders nothing. Run `npm run example:showcase`
// and no provider is mounted, `useSectionSource` returns null, and the header
// is the header. The site mounts a provider and the same headers grow a
// control. The example does not know what goes in the slot, and nothing about
// the slot is reachable from the form's own behaviour.
// ===========================================================================
import { createContext, useContext, type ReactNode } from "react";

/**
 * One per card on the screen, in the order they appear.
 *
 * A union rather than a string: whatever fills the slot is looked up by this
 * id, so a card naming a section that does not exist should not compile.
 */
export type SectionId =
  | "applicant"
  | "company"
  | "billing"
  | "shipping"
  | "items"
  | "terms";

const NOTHING = (): ReactNode => null;

const SectionSource = createContext<(id: SectionId) => ReactNode>(NOTHING);

export const SectionSourceProvider = SectionSource.Provider;

/** What to put in this section's header slot, which is usually nothing. */
export function useSectionSource(id: SectionId | undefined): ReactNode {
  const fill = useContext(SectionSource);
  return id === undefined ? null : fill(id);
}
