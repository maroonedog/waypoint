// ===========================================================================
// field.tsx — layers 2 and 3, in one component.
//
// A children function is layer 3: it receives the binding and returns whatever
// it likes, and it is called as this component's return value rather than
// invoked inside its body for bookkeeping, so passing the binding on to a
// child component is ordinary React.
//
// Without one, a widget is resolved and given the same binding. Layer 2 is
// therefore layer 3 with the caller's function looked up instead of written
// inline, and there is no second implementation for the two to diverge
// between.
//
// A field nothing can draw renders nothing rather than throwing. A registry is
// allowed to be partial, and a form that loses one input is easier to diagnose
// than one that fails to render at all.
//
// A CLOSED field — one whose descriptor carries `choices` — is drawn by the
// caller too, and this component was the obvious place to make an exception
// and render `<option>`s itself. It was rejected. Rendering them means owning
// the empty placeholder option, its text, its language and its class names,
// and a `<select>` this library authored is a widget library by another name —
// which is the one thing layer 1's comment promises it will not become. What
// was missing was not markup but the trip back: the DOM returns the string
// "2", the schema declared the number 2, and only the choice list knows they
// are the same. `inputProps` now does that mapping, omits the `type` and the
// input-only constraints a select cannot carry, and the caller writes:
//
//   <select {...field.inputProps}>
//     <option value="">…</option>
//     {field.descriptor?.choices?.map((choice) => (
//       <option key={String(choice.value)} value={String(choice.value)}>
//         {choice.label}
//       </option>
//     ))}
//   </select>
// ===========================================================================
import { useContext, type ReactElement, type ReactNode } from "react";
import type { FieldBinding } from "./field-binding.types.js";
import { useField } from "./use-field.js";
import { WidgetRegistryContext } from "./widget-registry-context.js";
import { resolveWidget } from "./resolve-widget.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "./waypoint-forms.js";

export interface FieldProps<Q extends FormPath> {
  /**
   * The PLACE this field occupies, qualified by the form it belongs to. It
   * goes straight to `useField`, so a rule has no answer here — a list hands
   * each row `row.path`, and `` `${row.path}.sku` `` is the spelling that
   * names one of them, already carrying its form.
   *
   * This prop had no way to name a form before the path carried one. It is one
   * string, the component is generic over it, and there was nowhere to put a
   * key beside it — so one screen's path compiled inside another screen's
   * component, and the mistake showed up as a field that drew nothing.
   */
  readonly path: Q & InhabitedFormPath<Q>;
  /** Layer 3. When present, nothing else is consulted. */
  readonly children?: (binding: FieldBinding<ValueAtFormPath<Q>>) => ReactNode;
  /** Layer 2: the widget to draw this field with, by name. */
  readonly as?: string;
}

export function Field<Q extends FormPath>(props: FieldProps<Q>): ReactElement {
  // The type argument is written rather than inferred. `props.path` is already
  // `Q & InhabitedFormPath<Q>`, and inferring from it would make Q that
  // intersection and then narrow it a second time — which the compiler cannot
  // see is the same question asked twice, so it refuses its own output.
  const binding = useField<Q>(props.path);
  const registry = useContext(WidgetRegistryContext);

  if (props.children !== undefined) {
    return <>{props.children(binding)}</>;
  }
  const shown = binding as FieldBinding<unknown>;
  const widget = resolveWidget(registry, shown, props.as);
  return <>{widget === undefined ? null : widget({ field: shown })}</>;
}
