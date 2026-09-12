// ===========================================================================
// use-participation.ts — a subtree that stops blocking while it is here.
//
// Applied in an effect rather than during render, because it writes to the
// store and a render that writes is a render that can loop.
//
// The teardown puts the subtree back rather than leaving it dormant. A scope
// that unmounted is a scope that stopped having an opinion, and leaving its
// last opinion behind would silence a subtree nobody can see any more.
//
// THE PATH IS A PLACE, and this is the one surface where the wildcard failed
// SILENTLY rather than by throwing — which is why it was the last of them to
// be noticed. `setParticipating` asserts nothing; it records the string as a
// dormant root, and `isParticipating` matches descendants with
// `isAncestorPath`, a segment-anchored prefix test. `isAncestorPath("items[*]",
// "items[0].sku")` is false, so a wildcard root matches nothing, ever: the
// subtree the caller asked to stop blocking went on blocking the submit and
// said nothing about it. `items[0]` is what actually silences a row.
// ===========================================================================
import { useEffect } from "react";
import type { ConcretePath } from "../contract/index.js";
import type { FormHandle } from "../core/index.js";

export function useParticipation<T, TPath extends string>(
  form: FormHandle<T, TPath>,
  path: ConcretePath<TPath>,
  participating: boolean | undefined
): void {
  useEffect(() => {
    if (participating === undefined || path === "") return undefined;
    form.setParticipating(path, participating);
    return () => form.setParticipating(path, true);
  }, [form, path, participating]);
}
