// ===========================================================================
// ShowcaseScreen.tsx — the showcase, on this site.
//
// IT IS THE EXAMPLE ITSELF, not a copy of it. The import below reaches into
// `examples/showcase`, so the screen a reader types into on this page is built
// from the files `npm run example:showcase` serves and `npm run test:types`
// compiles. A second copy would be a screen that drifts, and drifts silently,
// because nothing compares two React trees.
//
// WHAT THIS FILE ADDS is the frame the example gets from its own `index.html`
// and does not have here: the submitted-JSON panel. The example's `main.tsx`
// owns that, and `main.tsx` also calls `createRoot`, which an Astro island
// must not — so the panel is re-made here rather than the entry re-used.
//
// THE REGISTRY IS WHY THE SHOWCASE'S KEY IS `application`. This page's own
// demos register `form`, and an augmentation is global to the COMPILATION, so
// two files declaring `form` in one program merge into whichever the checker
// reaches last — silently, because the adapter's value type is phantom and
// TS2717 does not fire. Renaming the showcase's key is what lets both live
// here, and it makes this site a program with two registered forms, which is
// the arrangement qualified paths exist for.
// ===========================================================================
import { useCallback, useState, type ReactElement, type ReactNode } from "react";
import { ApplicationForm } from "../../../examples/showcase/src/application-form.js";
import {
  SectionSourceProvider,
  type SectionId,
} from "../../../examples/showcase/src/section-source.js";
import { panelIdOf } from "./section-panel.js";

// THE CONTROL FOR ONE SECTION'S CODE, and it is only a button: the panel it
// opens is rendered by showcase.astro, already highlighted, because Shiki runs
// at build time. `popovertarget` joins the two across the island boundary with
// no JavaScript of ours in between — no state, no portal, nothing to hydrate
// beyond the button itself, and a click outside already closes it.
//
// Lower case on purpose. React 19 has `popoverTarget`, but writing the HTML
// attribute is what actually reaches the DOM on either version, and this is a
// DOM API rather than a React one.
function SectionCode({ id }: { readonly id: SectionId }): ReactElement {
  return (
    <button
      type="button"
      {...{ popovertarget: panelIdOf(id) }}
      className="state-layer relative flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-sm text-on-surface-variant"
    >
      <span aria-hidden className="material-symbols-rounded text-[18px]">
        code
      </span>
      Code
    </button>
  );
}

export default function ShowcaseScreen(): ReactElement {
  const [submitted, setSubmitted] = useState<unknown>(undefined);

  // Stable, so the provider does not hand every card a new function on each
  // keystroke the form takes.
  const sectionSource = useCallback(
    (id: SectionId): ReactNode => <SectionCode id={id} />,
    []
  );

  return (
    // `md3-scope` IS WHAT KEEPS THIS A MATERIAL SCREEN. The documentation site
    // re-points Tailwind's colour utilities at its own tokens, and this class
    // points them back — so `bg-surface-high` inside here means what it means
    // in the application, and the same class outside here means what it means
    // on this site. One indirection, declared once in styles.css, so the
    // screen on this page and the screen on its own port render off one token
    // file rather than off two copies that drift.
    <div className="md3-scope rounded-lg border border-outline-variant bg-surface-low p-4 sm:p-6">
      {submitted === undefined ? null : (
        <div className="mb-4 rounded-lg bg-primary-container p-5 text-on-primary-container">
          <h3 className="mb-2 flex items-center gap-2 text-base font-medium">
            <span aria-hidden className="material-symbols-rounded text-[20px]">
              check_circle
            </span>
            Application received
          </h3>
          <pre className="max-h-64 overflow-auto rounded-sm bg-surface-lowest/60 p-3 text-xs text-on-surface">
            {JSON.stringify(submitted, null, 2)}
          </pre>
          <button
            type="button"
            className="mt-3 rounded-full border border-outline px-4 py-2 text-sm"
            onClick={() => setSubmitted(undefined)}
          >
            Close
          </button>
        </div>
      )}
      <SectionSourceProvider value={sectionSource}>
        <ApplicationForm onSubmitted={setSubmitted} />
      </SectionSourceProvider>
    </div>
  );
}
