// ===========================================================================
// showcase-sections.ts — the code behind one section of the running form.
//
// The listing further down /showcase/ has every file on it, which answers the
// question "what is all of this" and not the question a reader actually has in
// front of a section: what makes THIS part work. So each card's header carries
// a control, and what it opens is the function that renders that card — cut
// out of the file at build time rather than retyped.
//
// CUT BY NAME, NOT BY MARKER. A `#region` comment in the example would be a
// comment that exists for this website, sitting in source the page also
// displays; the reader would see the scaffolding of their own tour. The
// function declaration is already a boundary, and `sliceFunction` fails loudly
// if it stops being one.
// ===========================================================================
import applicationForm from "../../../examples/showcase/src/application-form.tsx?raw";
import itemsSection from "../../../examples/showcase/src/sections/items-section.tsx?raw";
import type { SectionId } from "../../../examples/showcase/src/section-source.js";

/**
 * One top-level function declaration, from its `function` line to the `}` that
 * closes it in column zero.
 *
 * The example is Prettier-formatted, so a brace in column zero is the end of a
 * top-level declaration and nothing else. If that ever stops being true this
 * throws during the build rather than putting half a function on the page.
 */
const sliceFunction = (source: string, name: string): string => {
  const lines = source.split("\n");
  const opens = lines.findIndex((line) => line.startsWith(`function ${name}(`));
  if (opens < 0) {
    throw new Error(`showcase-sections: no top-level function ${name}`);
  }
  const closes = lines.findIndex((line, n) => n > opens && line === "}");
  if (closes < 0) {
    throw new Error(`showcase-sections: ${name} has no closing brace at column 0`);
  }
  return lines.slice(opens, closes + 1).join("\n");
};

export interface SectionSourceEntry {
  readonly id: SectionId;
  /** The card's own title, so the panel and the header agree. */
  readonly title: string;
  /** Where this came from, written in the site's label grammar. */
  readonly file: string;
  /** One line on what to look at in it. */
  readonly note: string;
  readonly code: string;
}

export const SECTIONS: readonly SectionSourceEntry[] = [
  {
    id: "applicant",
    title: "Who to contact",
    file: "src/application-form.tsx",
    note: "Five fields, each one a path and a widget. Nothing is passed to the section and nothing is passed out of it.",
    code: sliceFunction(applicationForm, "ApplicantSection"),
  },
  {
    id: "company",
    title: "The company",
    file: "src/application-form.tsx",
    note: "The same shape again. The number field and the text field differ in what they render, not in what they are handed.",
    code: sliceFunction(applicationForm, "CompanySection"),
  },
  {
    id: "billing",
    title: "Billing address",
    file: "src/application-form.tsx",
    note: "Both address cards come from this one function. AddressFields is told where it is by a prop and nothing else — see src/sections/address-fields.tsx in the listing below.",
    code: sliceFunction(applicationForm, "AddressSections"),
  },
  {
    id: "shipping",
    title: "Shipping address",
    file: "src/application-form.tsx",
    note: "The same function. useParticipation is what stops the shipping verdict counting while the box is ticked — the values it holds never go anywhere.",
    code: sliceFunction(applicationForm, "AddressSections"),
  },
  {
    id: "items",
    title: "Order lines",
    file: "src/sections/items-section.tsx",
    note: "Rows come from FieldRows, and the total's complaint arrives at `items` — a path with no input of its own — which is why OrderTotalNotice reads it with a hook.",
    code: itemsSection.replace(/\n+$/, ""),
  },
  {
    id: "terms",
    title: "Payment and terms",
    file: "src/application-form.tsx",
    note: "A choice, a long text and a checkbox. Three widgets, three paths, one binding each.",
    code: sliceFunction(applicationForm, "TermsSection"),
  },
];
