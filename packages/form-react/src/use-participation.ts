// ===========================================================================
// use-participation.ts — a subtree that stops blocking while it is here.
//
// Applied in an effect rather than during render, because it writes to the
// store and a render that writes is a render that can loop.
//
// The teardown puts the subtree back rather than leaving it dormant. A scope
// that unmounted is a scope that stopped having an opinion, and leaving its
// last opinion behind would silence a subtree nobody can see any more.
// ===========================================================================
import { useEffect } from "react";
import type { AddressablePath } from "form-contract";
import type { FormHandle } from "form-core";

export function useParticipation<T, TPath extends string>(
  form: FormHandle<T, TPath>,
  path: AddressablePath<TPath>,
  participating: boolean | undefined
): void {
  useEffect(() => {
    if (participating === undefined || path === "") return undefined;
    form.setParticipating(path, participating);
    return () => form.setParticipating(path, true);
  }, [form, path, participating]);
}
