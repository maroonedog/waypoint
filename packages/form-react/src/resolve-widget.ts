// ===========================================================================
// resolve-widget.ts — the one order in which a widget is chosen.
//
// Most specific first: a name the caller wrote, then this exact field, then
// the shape a vendor named, then the fact that the field is closed, then its
// family, then whatever is left.
//
// The path is matched DECLARED, so one entry covers every row of a list; a
// registry keyed by concrete path would need an entry per row and would go
// stale the moment a row was inserted.
// ===========================================================================
import { declaredPathOf } from "form-core";
import type { FormWidget, WidgetRegistry } from "./widget-registry.types.js";
import type { FieldBinding } from "./field-binding.types.js";

export function resolveWidget(
  registry: WidgetRegistry,
  binding: FieldBinding<unknown>,
  name: string | undefined
): FormWidget | undefined {
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
