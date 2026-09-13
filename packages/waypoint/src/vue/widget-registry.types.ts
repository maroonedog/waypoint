// ===========================================================================
// widget-registry.types.ts — the shared lookup table, with Vue's component
// type filled in.
//
// The table, its six keys and the order they are consulted in are all in
// `../dom/widget-registry.types.ts` and `../dom/resolve-widget.ts`, which name
// no framework. What is here is the one thing that differs: what a widget IS.
//
// A widget receives the binding as a prop rather than as an argument, because
// that is how a Vue component receives anything and because it is what lets an
// application write the widget as an ordinary `.vue` file with
// `defineProps<WidgetProps>()`.
// ===========================================================================
import type { Component } from "vue";
import type { WidgetRegistryOf } from "../dom/widget-registry.types.js";
import type { FieldBinding } from "./field-binding.types.js";

/** What every widget in a registry is handed. */
export interface WidgetProps {
  readonly field: FieldBinding<unknown>;
}

/** Anything Vue can render given `WidgetProps` — an SFC, or a render function. */
export type FormWidget = Component;

export type WidgetRegistry = WidgetRegistryOf<FormWidget>;

/** A registry that names nothing, so a provider without one still has a value. */
export const EMPTY_REGISTRY: WidgetRegistry = {};
