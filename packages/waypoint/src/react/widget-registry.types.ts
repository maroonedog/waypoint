// ===========================================================================
// widget-registry.types.ts — layer 2: which component draws which field.
//
// A widget receives the same binding a children function receives, so a widget
// is a layer-3 caller that happens to be reusable. There is no separate widget
// API to learn and no second implementation for the two heights to diverge
// between.
//
// Every entry is optional. A registry that names one widget for one path is a
// legitimate registry, and a form with no registry at all still renders
// through the fallback.
// ===========================================================================
import type { ReactNode } from "react";
import type { FormFieldKind } from "../contract/index.js";
import type { FieldBinding } from "./field-binding.types.js";

export interface WidgetProps {
  readonly field: FieldBinding<unknown>;
}

export type FormWidget = (props: WidgetProps) => ReactNode;

export interface WidgetRegistry {
  /** Named by a caller writing `as`, which beats every other rule. */
  readonly byName?: Readonly<Record<string, FormWidget>>;
  /** Keyed by DECLARED path, so one entry serves every row of a list. */
  readonly byPath?: Readonly<Record<string, FormWidget>>;
  /** Keyed by the constraint a vendor named, such as `email` or `date-time`. */
  readonly byFormat?: Readonly<Record<string, FormWidget>>;
  /** Used when the field is closed, whatever its kind. */
  readonly choices?: FormWidget;
  readonly byKind?: Readonly<Partial<Record<FormFieldKind, FormWidget>>>;
  /** Drawn when nothing else matched, including for an unknown kind. */
  readonly fallback?: FormWidget;
}
