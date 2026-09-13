// ===========================================================================
// resolve-widget.ts — the one order in which a widget is chosen.
//
// A FILE NO FRAMEWORK OWNS. The order below is a property of the registry and
// of the descriptor, not of whatever draws the result, so it is stated once
// here and a binding fills in `TWidget` with its own component type.
//
// Most specific first: a name the caller wrote, then this exact field, then
// the shape a vendor named, then the fact that the field is closed, then its
// family, then whatever is left.
//
// The path is matched DECLARED, so one entry covers every row of a list; a
// registry keyed by concrete path would need an entry per row and would go
// stale the moment a row was inserted.
//
// It takes a `WidgetSubject` rather than a whole binding, because those two
// members are all it reads. That is what lets one implementation answer for a
// binding of any shape.
// ===========================================================================
import type { FormFieldDescriptor } from "../contract/index.js";
import { declaredPathOf } from "../core/index.js";
import type { WidgetRegistryOf } from "./widget-registry.types.js";

/** The two members the order above reads off the field. */
export interface WidgetSubject {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
}

export function resolveWidget<TWidget>(
  registry: WidgetRegistryOf<TWidget>,
  binding: WidgetSubject,
  name: string | undefined
): TWidget | undefined {
  if (name !== undefined) {
    const named = registry.byName?.[name];
    if (named !== undefined) return named;
  }
  const forPath = registry.byPath?.[declaredPathOf(binding.path)];
  if (forPath !== undefined) return forPath;

  const format = binding.descriptor?.constraints.format;
  if (format !== undefined) {
    const forFormat = registry.byFormat?.[format];
    if (forFormat !== undefined) return forFormat;
  }
  if (binding.descriptor?.choices !== undefined && registry.choices !== undefined) {
    return registry.choices;
  }
  const kind = binding.descriptor?.kind;
  if (kind !== undefined) {
    const forKind = registry.byKind?.[kind];
    if (forKind !== undefined) return forKind;
  }
  return registry.fallback;
}
