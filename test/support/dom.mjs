// One jsdom for every test file that renders, so there is only one copy of it
// left to be wrong.
//
// WHY THIS IS A MODULE AND NOT A PARAGRAPH EACH FILE KEEPS. Duplicated setup
// does not fail the way duplicated logic fails. Logic that drifts gives a
// wrong answer somebody can see and chase. An environment that drifts gives
// the SAME assertion passing in one file and failing in another, for a reason
// that is written in neither of them — the reader diffs the two tests, finds
// them identical, and has nowhere left to look. Nine of these blocks were
// byte-identical on the day this module was extracted, which is at once the
// good case and the fragile one: they agreed, and nothing was making them.
//
// WHAT IS DELIBERATELY NOT HERE. file-field.test.mjs never renders anything.
// It builds a jsdom to borrow a single constructor, `File`, and giving it a
// document and an act environment it does not use would dress a descriptor
// test up as a DOM one. That is a finding rather than a leftover, and it is
// recorded here because an environment that differs on purpose stays safe only
// while the purpose is written down. Undocumented, the next reader diffing the
// copies cannot tell it apart from the drift this module exists to stop.
//
// accessibility-axe.harness.mjs also builds its own, and its banner says what
// that is measured to be worth — which is nothing the run turns on. Keep this
// entry as a pointer and let that file carry the argument.
//
// WHY IMPORTING THIS HAS EFFECTS. It assigns globals, so a reader who sees
// only `import { dom }` cannot tell from the call site that `document` now
// exists. That opacity is the price, and what it buys is ORDER. React reads
// these globals once, when `react-dom/client` is first evaluated — not when
// something first renders — so the environment must be standing before that
// import rather than before the first test. A static import is hoisted and
// fully evaluated before the body of the importing file, which makes the
// ordering hold wherever the dynamic imports underneath it drift to; a
// function each file remembered to call could be moved one line too low, and
// the symptom would be React quietly concluding it is running on a server.
// `node --test` runs each file in its own process, so the usual objection to a
// module that writes to globals — that some unrelated importer inherits them —
// has nobody here to apply to.
//
// SO EVERY TEST FILE THAT RENDERS NAMES THIS MODULE ITSELF, above the mount
// helper, though react-root, warning-mount and postcode-slice each import it
// first and would bring it anyway. Some take the handle — for `Event` and
// `HTMLInputElement` where a test constructs one, for `document` where it
// reaches past the container it rendered into — and the rest take the bare
// side-effect import. The only file that RENDERS without this module is
// accessibility-axe.harness.mjs, named above; file-field.test.mjs is also
// named above and does not render at all. The redundant line earns itself
// twice — it puts
// this module first in the importing file's OWN graph, so no reordering
// beneath it can put `react-dom/client` ahead of the globals, and it makes a
// file's environment readable from its import block, which is how a reader
// tells these from the pure halves that run with no document at all. Nothing
// enforces it: a file that dropped the line would pass until the day its
// helper stopped importing this, and then fail whole with no line to blame.
import { JSDOM } from "jsdom";

export const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
// The two Vue needs, and it needs them as GLOBALS rather than off `window`:
// @vue/runtime-dom's mount path dereferences `Element` unguarded to decide
// whether it was handed a node, and `SVGElement` unguarded to work out a root
// namespace. `MathMLElement` is deliberately absent from this list — that same
// call site reaches it through `typeof MathMLElement === "function"`, and this
// jsdom does not define one. Without these two, mounting fails as a bare
// `ReferenceError` with nothing in it to say which library wanted the name.
globalThis.Element = dom.window.Element;
globalThis.SVGElement = dom.window.SVGElement;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // A navigator already provided by the host is fine.
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
