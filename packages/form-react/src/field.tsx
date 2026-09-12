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
// ===========================================================================
import { useContext, type ReactElement, type ReactNode } from "react";
import type { AddressablePath, DeclaredOf } from "form-contract";
import type { FieldBinding } from "./field-binding.types.js";
import { useField } from "./use-field.js";
import { WidgetRegistryContext } from "./widget-registry-context.js";
import { resolveWidget } from "./resolve-widget.js";
import type { AnyPath, AnyValues, ValueOfPath } from "./form-type-registry.js";

export interface FieldProps<K extends AddressablePath<AnyPath>> {
  readonly path: K;
  /** Layer 3. When present, nothing else is consulted. */
  readonly children?: (
    binding: FieldBinding<ValueOfPath<AnyValues, DeclaredOf<K>>>
  ) => ReactNode;
  /** Layer 2: the widget to draw this field with, by name. */
  readonly as?: string;
}

export function Field<K extends AddressablePath<AnyPath>>(
  props: FieldProps<K>
): ReactElement {
  const binding = useField(props.path);
  const registry = useContext(WidgetRegistryContext);

  if (props.children !== undefined) {
    return <>{props.children(binding)}</>;
  }
  const shown = binding as FieldBinding<unknown>;
  const widget = resolveWidget(registry, shown, props.as);
  return <>{widget === undefined ? null : widget({ field: shown })}</>;
}
