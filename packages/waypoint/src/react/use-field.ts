// ===========================================================================
// use-field.ts — one place, bound, and taken responsibility for.
//
// The subscriptions are in bind-field.ts, which this shares with `<Field>`.
// What this adds is the claim the other one cannot make on its own: whoever
// called this hook is going to draw the field. A hook hands its binding to the
// component that asked for it and no widget lookup can come back empty, so
// there is no case here where the binding is taken and nothing reaches the
// screen — which is exactly the case `<Field>` has to consider.
//
// REPORTED WHILE RENDERING rather than from an effect. The question the report
// answers is whether anybody WROTE a component for this place, and a render
// React discards still answers it. Reporting from an effect would make the
// answer depend on what is mounted at that instant, which is a different
// question, and would cost a second effect on every field to get it wrong.
// Nothing is written to the store and nothing re-renders, so this is not the
// render that writes.
//
// The path is checked against the registry and the value type comes from it.
// Neither is asserted by the caller any more: `useField<string>(path)` used to
// mean "trust me", and what it usually meant was a misspelt path rendering an
// empty input that was never validated and said nothing.
//
// THE SECOND ARGUMENT IS THIS FIELD'S OWN BEHAVIOUR, and it is here because
// this call is the contract between a component and a form. When a pass runs
// is a fact about the form and stays in `FormOptions.validateOn`; when THIS
// field starts speaking is a fact about this component, and two components
// binding the same path may honestly want different answers.
//
// ONE PATH ARGUMENT, because the path says which form it belongs to:
// `useField("admin:quotas.seats")`. There is no second spelling that takes the
// form beside the path — one call shape, so the value type is read out of the
// form the path itself names rather than out of every registered form at once.
// An application with a single registered form writes no prefix.
// ===========================================================================
import type { FieldBinding } from "./field-binding.types.js";
import { useFieldBinding, type FieldOptions } from "./bind-field.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "./waypoint-forms.js";

export function useField<Q extends FormPath>(
  path: Q & InhabitedFormPath<Q>,
  options?: FieldOptions
): FieldBinding<ValueAtFormPath<Q>>;
export function useField(
  spelling: string,
  options?: FieldOptions
): FieldBinding<never> {
  const bound = useFieldBinding(spelling, options);
  bound.form.coverage.addressed(bound.path);
  return bound.binding;
}
