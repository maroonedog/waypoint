// ===========================================================================
// pass-counter.ts — how many times the validator has actually been asked.
//
// The counter is its own little store rather than React state, for the same
// reason the runtime it is measuring is: whatever reads it must be able to
// re-render without re-rendering the form. A `useState` in the component that
// draws the fields would wake every field on every pass, and the per-field
// render counts beside them — the whole point of the demo — would measure the
// instrument instead of the thing.
// ===========================================================================
import type { FormAdapter, FormIssue, MaybeAsync } from "form-contract";

export interface PassCounter {
  /** The adapter to hand to `createForm`: the real one, counted. */
  readonly adapter: FormAdapter<unknown, string>;
  subscribe(listener: () => void): () => void;
  read(): number;
  reset(): void;
}

export function createPassCounter<T, TPath extends string>(
  base: FormAdapter<T, TPath>
): PassCounter {
  let passes = 0;
  const listeners = new Set<() => void>();
  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const counted: FormAdapter<T, TPath> = {
    fields: base.fields,
    validate(root: unknown): MaybeAsync<readonly FormIssue[]> {
      passes += 1;
      // Announced in a microtask: the pass runs inside the runtime's own
      // flush, and telling React about it there would be a render during a
      // render for whoever is listening.
      void Promise.resolve().then(announce);
      return base.validate(root);
    },
  };

  return {
    adapter: counted as unknown as FormAdapter<unknown, string>,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read: () => passes,
    reset() {
      passes = 0;
      announce();
    },
  };
}
