// ===========================================================================
// use-field.ts — one place, bound, and taken responsibility for.
//
// The subscriptions are in bind-field.ts, which this shares with `<Field>`.
// What this adds is the claim the other one cannot make on its own: whoever
// called this is going to draw the field. A composable hands its binding to
// the component that asked for it and no widget lookup can come back empty, so
// there is no case here where the binding is taken and nothing reaches the
// screen — which is exactly the case `<Field>` has to consider.
//
// THE PATH IS CHECKED AGAINST THE SAME REGISTRY A REACT FILE READS. The
// augmentation names the ROOT module, `@maroonedog/waypoint`, so `FormPath`,
// `ValueAtFormPath` and `CodesAtFormPath` here are the very types a React
// component in the same repository is checked against. Nothing in this entry
// declares a registry of its own and nothing needs to.
//
// REPORTED WHEN THE BINDING IS TAKEN, not from a mounted hook. The question
// the report answers is whether anybody WROTE a component for this place, and
// a `setup()` whose component is then thrown away still answers it. The
// watcher re-reports when the path moves, which is the case Vue has and React
// does not: a hook re-runs and re-reports for free, while `setup()` runs once.
// Nothing is written to the store and nothing re-renders.
//
// ONE PATH ARGUMENT, because the path says which form it belongs to:
// `useField("admin:quotas.seats")`. An application with a single registered
// form writes no prefix.
// ===========================================================================
import { watchEffect, type MaybeRefOrGetter } from "vue";
import type { FieldBinding } from "./field-binding.types.js";
import { useFieldBinding, type FieldOptions } from "./bind-field.js";
import type {
  CodesAtFormPath,
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "../contract/index.js";

export function useField<Q extends FormPath>(
  path: MaybeRefOrGetter<Q & InhabitedFormPath<Q>>,
  options?: FieldOptions<CodesAtFormPath<Q>>
): FieldBinding<ValueAtFormPath<Q>>;
export function useField(
  spelling: MaybeRefOrGetter<string>,
  options?: FieldOptions<never>
): FieldBinding<never> {
  const bound = useFieldBinding(spelling, options);
  watchEffect(() => {
    bound.form.coverage.addressed(bound.path.value);
  });
  return bound.binding;
}
