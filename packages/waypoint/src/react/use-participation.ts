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
//
// IT TAKES A QUALIFIED PATH FOR THE SAME REASON, and that is the same defect
// caught a second time. A row is silenced by `row.path`, and `row.path` names
// its form; handed to a `setParticipating` that reads the whole string as an
// address, `form:items[1]` is a dormant root no descendant is under, so the
// row went on blocking the submit and nothing was thrown, warned or logged.
// The prefix comes off here, against the same key every sibling hook uses,
// and a path naming another form throws the way it does everywhere else.
//
// THE KEY COMES FROM CONTEXT, not from the handle passed in, even though a
// handle is passed in here. The path this is handed was spelled by `useRows`
// under the enclosing provider, so the context key is the one that spelled it
// — reading `form.key` instead would disagree with that spelling exactly when
// a provider overrides the key its form was created with.
// ===========================================================================
import { useContext, useEffect } from "react";
import type { ConcretePath } from "../contract/index.js";
import type { FormHandle } from "../core/index.js";
import { FormKeyContext } from "./form-key-context.js";
import { formPathWithin } from "./parse-qualified-path.js";
import type { FormKey } from "./form-type-registry.js";

export function useParticipation<T, TPath extends string>(
  form: FormHandle<T, TPath>,
  path: ConcretePath<TPath> | `${FormKey}:${ConcretePath<TPath>}`,
  participating: boolean | undefined
): void {
  const key = useContext(FormKeyContext);
  useEffect(() => {
    if (participating === undefined || path === "") return undefined;
    const local = formPathWithin(path, key);
    form.setParticipating(local, participating);
    return () => form.setParticipating(local, true);
  }, [form, path, participating, key]);
}
