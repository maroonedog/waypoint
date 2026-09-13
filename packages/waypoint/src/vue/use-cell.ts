// ===========================================================================
// use-cell.ts — one `CellSource` as one Vue `computed`, and the three choices
// in it that were each forced by a measurement rather than by taste.
//
// React's binding is one `useSyncExternalStore` call over the same two
// members, and that is the whole of it. Vue's reactivity is push-based and
// automatically tracked, so the subscription and the read have to be wired to
// each other by hand, and the obvious wirings are each wrong in a different
// way.
//
// WHY `computed` RATHER THAN A REF HOLDING THE VALUE. A ref written from the
// subscription re-reads the source on every notification whether or not
// anybody is drawing the value. A `computed` over a version counter re-reads
// only when somebody asks. A form reads most field values in handlers rather
// than in markup, so that difference is paid per keystroke per field.
//
// WHY THE SUBSCRIPTION IS OPENED INSIDE `watchEffect`. Vue skips watchers
// during server rendering, so a subscription opened there is never opened on
// the server — and one opened in the setup body is, once per request, with
// nothing to dispose it and no warning. Measured against @vue/server-renderer,
// 50 `renderToString` calls over one source: 0 live listeners through a
// `watchEffect`, 50 through a bare `source.subscribe()` in `setup()`. Its
// first run is also synchronous, so there is no gap between the first render
// and the subscription, which is the hole React's post-subscribe re-check
// patches.
//
// WHY THE GUARD, AND WHY IT ASKS FOR A SCOPE RATHER THAN AN INSTANCE. Called
// where no scope is active — module scope, after an `await` in an async
// `setup()`, inside a handler that runs after mount — `watchEffect` opens a
// subscription nothing will ever dispose, AND EMITS NO WARNING; the lifecycle
// hooks at least say something. `getCurrentScope()` is true in `setup()` and
// inside `effectScope().run()` and false at all three of those, which is
// exactly the line. `getCurrentInstance()` would reject the effect scope, and
// a store holding a binding is a call site this library means to support.
//
// THE SOURCE IS ITSELF ALLOWED TO MOVE, which React never has to arrange: a
// hook re-runs every render and picks up the new source for free, while a Vue
// `setup()` runs once. So the argument is a getter as readily as a value, the
// watcher tracks it, and a `<Field>` whose `path` prop changes moves its
// subscription instead of keeping the old field's.
//
// ONE DIVERGENCE FROM REACT, STATED RATHER THAN FOUND. `useSyncExternalStore`
// re-reads the snapshot on every render, so a source whose value moved WITHOUT
// notifying its listeners still surfaces in React. Nothing here re-reads until
// the version moves, so such a source would read stale in Vue. Every source in
// `./core` notifies; this is the premise that has to stay true.
// ===========================================================================
import {
  computed,
  getCurrentScope,
  shallowRef,
  toValue,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import type { CellSource } from "../core/index.js";

export function useCell<T>(
  source: MaybeRefOrGetter<CellSource<T>>
): ComputedRef<T> {
  if (getCurrentScope() === undefined) {
    throw new Error(
      "useCell() was called where no effect scope is active, so the " +
        "subscription it opens could never be closed. Call it from setup(), " +
        "or inside an effectScope()."
    );
  }
  const version = shallowRef(0);
  watchEffect((onCleanup) => {
    onCleanup(
      toValue(source).subscribe(() => {
        version.value += 1;
      })
    );
  });
  return computed(() => {
    // Read for the dependency and discarded: the counter says a notification
    // happened, and the source says what it now holds.
    version.value;
    return toValue(source).read();
  });
}
