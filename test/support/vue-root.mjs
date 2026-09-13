// Mounting a Vue app the way every Vue test here needs it mounted, and the two
// ways it is deliberately NOT react-root.mjs.
//
// IT IS SYNCHRONOUS, WHERE THE REACT HELPER IS NOT. React's render has to go
// through `act` so that effects and the passes they schedule have finished
// before the test looks. Vue's `app.mount()` runs setup and the first render
// before it returns, and `onMounted` with it, so there is nothing to await and
// nothing to wrap. A helper that returned a promise anyway would teach every
// Vue test to await a value that was already there, and the first reader to
// drop the `await` would find it still passing — which is how an await that
// means something and an await that means nothing stop being distinguishable.
//
// AND `nextTick` IS NOT THE SETTLE. This is the line that costs a debugging
// session if it is not written down. Vue's own reactivity flushes on the next
// microtask, so `await nextTick()` is enough for a test about Vue and nothing
// else. It is NOT enough for anything that crosses the form runtime: a value
// edit schedules its pass on a promise of its own, the cell notifies from
// inside that, and Vue's flush is then queued BEHIND the continuation the test
// is already waiting on. So the DOM is still stale after one `nextTick`, and
// how many more are needed depends on how deep the adapter's promise chain is.
// Measured here against this repository's zod adapter, typing one refused
// character and reading the message line: the DOM was still empty at tick one
// and current at tick two; wrapping the same adapter's `validate` in an async
// function moved that to tick three. Nothing pins it at either number. A
// macrotask boundary drains the whole microtask queue whatever its depth, and
// one of those — `settle()` — was enough in both runs, so that is what these
// tests wait on.
//
// THE CONTAINER IS PUT IN THE DOCUMENT for the reason react-root.mjs gives:
// focus only exists for nodes the document contains, and a test that reads
// `document.activeElement` against a detached container reads BODY and blames
// the library.
//
// THE `dom.mjs` IMPORT IS FIRST AND IS ORDERING, NOT TIDINESS.
// @vue/runtime-dom reads `document` at module-evaluation time to build a
// template element it keeps for the life of the process — not at first mount —
// so the globals have to be standing before `import("vue")` resolves, which is
// why that import is dynamic and this one is static.
import { dom } from "./dom.mjs";

const { createApp } = await import("vue");

/** Mounts `component` into a fresh container inside the document body. */
export function mountIntoDocument(component, props) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const app = createApp(component, props);
  app.mount(container);
  return { container, app };
}

/** What a test reads out of the container: one element per assertion, by id. */
export const find = (container, id) => container.querySelector("#" + id);

/** Types into a control the way a person does — the event Vue binds `onInput` to. */
export function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

/** Leaves a control, which is what `showIssues: "touched"` waits for. */
export function blur(input) {
  input.dispatchEvent(new dom.window.Event("blur", { bubbles: false }));
}
