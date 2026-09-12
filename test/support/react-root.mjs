// Mounting a React root the way every rendering test here needs it mounted.
//
// This is not the DOM module's argument repeated one level up. That module is
// about copies drifting apart. This one is about two lines that read like
// housekeeping and are not, and which a file rewriting the four-line mount by
// hand is free to leave out:
//
// THE CONTAINER IS PUT IN THE DOCUMENT, and that is a load-bearing line rather
// than tidiness. Focus only exists for nodes the document contains: in a
// scratch run against jsdom 26.1.0, calling `focus()` on an input inside a
// container that was created but never appended left `document.activeElement`
// on BODY, while the same input in an appended container became the active
// element. error-summary-react.test.mjs makes its central claim — the reader
// ends up in the box that blocked the submit — by reading
// `document.activeElement`, which it does in five places and which no other
// file under test/ reads at all. A mount that skipped the append would not fail
// that test loudly at the append; it would fail it as "focusFirst did not move
// focus", which reads as a defect in the library rather than a missing line in
// the harness, and the search would start in the wrong package.
//
// THE RENDER GOES THROUGH `act`, so effects and the passes they schedule have
// finished before the test looks. Without it a test reads the tree one commit
// early, and what it records is not a wrong answer but an EARLY one — which
// shows up as a flake under load and passes on the machine of whoever is
// trying to reproduce it.
import { dom } from "./dom.mjs";

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");

/** Renders `element` into a fresh container inside the document body. */
export async function mountIntoDocument(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}
