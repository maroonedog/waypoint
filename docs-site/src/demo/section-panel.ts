// ===========================================================================
// section-panel.ts — the string that wires a control to its panel.
//
// The Popover API joins the two by id, and the two live on opposite sides of
// the island boundary: the control is React, inside the running form; the
// panel is Astro, rendered with the code already highlighted because Shiki
// runs at build time and cannot run in the browser. A typo in either half
// would not fail — the button would simply do nothing when pressed.
//
// Its own file, so the React side can have the string without importing the
// module that holds the source: that one `?raw`-imports the example, and
// every byte of it would land in the client bundle alongside the copy already
// in the page's HTML.
// ===========================================================================
import type { SectionId } from "../../../examples/showcase/src/section-source.js";

export const panelIdOf = (id: SectionId): string => `section-source-${id}`;
