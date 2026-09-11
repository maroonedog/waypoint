// ===========================================================================
// maybe-async.types.ts — a value, or the promise of one.
//
// Written as a union rather than as a promise everywhere, so a vendor that
// answers synchronously stays synchronous end to end. Making every answer a
// promise would put a microtask between a keystroke and the verdict for the
// overwhelming majority of forms, which never needed one.
// ===========================================================================

export type MaybeAsync<T> = T | Promise<T>;

/** True when the value still has to settle. */
export function isPending<T>(value: MaybeAsync<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
