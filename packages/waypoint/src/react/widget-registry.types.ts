// ===========================================================================
// widget-registry.types.ts — layer 2, as React spells it.
//
// A widget receives the same binding a children function receives, so a widget
// is a layer-3 caller that happens to be reusable. There is no separate widget
// API to learn and no second implementation for the two heights to diverge
// between.
//
// The table itself moved to `../dom/widget-registry.types.ts`, which says
// which widget is chosen without saying what a widget is. What is left here is
// the answer to that: a React component taking the binding. `WidgetRegistry`
// keeps its spelling and takes no type argument, so a caller writes what it
// always wrote.
// ===========================================================================
import type { ReactNode } from "react";
import type { WidgetRegistryOf } from "../dom/widget-registry.types.js";
import type { FieldBinding } from "./field-binding.types.js";

export interface WidgetProps {
  readonly field: FieldBinding<unknown>;
}

export type FormWidget = (props: WidgetProps) => ReactNode;

export type WidgetRegistry = WidgetRegistryOf<FormWidget>;
