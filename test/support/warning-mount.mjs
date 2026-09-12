// Rendering in order to find out what was COMPLAINED about, which is not what
// a mount usually has to do.
//
// WHY THIS IS NOT `mountIntoDocument`. That helper renders and hands back a
// tree, and a render that throws takes the test with it. Here the complaint is
// the result: a mis-addressed path warns, a mis-named form throws, and the
// files using this assert on both from the same call — so the mount has to
// return a container and a root even when the render never produced one, or
// every throwing test would have to be written in a different shape from every
// warning test and the pair would stop reading as one question.
//
// THE THREE LINES THAT LOOK LIKE HOUSEKEEPING AND ARE THE POINT:
//
//   `forgetUnaddressableWarnings()` first. The library warns once per path, on
//   purpose, so that a re-rendering component does not fill the console. Per
//   path is per process, and `node --test` gives a file one process — so
//   without this the SECOND test to name a given path would observe silence and
//   record it as "no warning", which is the same observation a broken check
//   produces. One test here asserts exactly that dedupe by counting; it can
//   only mean something if every other test starts from nothing remembered.
//
//   `console.warn` is captured rather than silenced, because it is the
//   assertion. `console.error` IS silenced, and only that one: React prints its
//   own error report when a render throws, which is noise about a throw the
//   test is deliberately causing and already asserts on.
//
//   The restore is in a `finally`, so a test whose render throws does not leave
//   the interceptor installed over every test that follows it in the file.
import { dom } from "./dom.mjs";

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { forgetUnaddressableWarnings } = await import("@maroonedog/waypoint/react");

/** Renders, and collects what was warned and whatever escaped. */
export async function mountCatching(element) {
  forgetUnaddressableWarnings();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const warnings = [];
  let escaped = null;
  const quietWarn = console.warn;
  const quietError = console.error;
  console.warn = (...parts) => warnings.push(parts.join(" "));
  console.error = () => {};
  try {
    await act(async () => root.render(element));
  } catch (error) {
    escaped = error;
  } finally {
    console.warn = quietWarn;
    console.error = quietError;
  }
  return { container, root, escaped, warnings, warned: warnings.join("\n") };
}

/**
 * What a test reads out of the container `mountCatching` returned: these
 * screens render one span per hook under test, identified by id.
 */
export const text = (container, id) => container.querySelector("#" + id).textContent;
