// ===========================================================================
// widget-registry.types.ts — which widget draws which field, without saying
// what a widget is.
//
// A FILE NO FRAMEWORK OWNS. The lookup table below is six optional keys and a
// precedence order (`./resolve-widget.ts` holds the order); none of that
// depends on whether a widget is a React component, a Vue one, or a function
// returning a string. So the widget is a type parameter, and
// `../react/widget-registry.types.ts` fills it in with React's component type
// under the same name a caller already writes.
//
// Every entry is optional. A registry that names one widget for one path is a
// legitimate registry, and a form with no registry at all still renders
// through the fallback.
// ===========================================================================
import type { FormFieldKind } from "../contract/index.js";

export interface WidgetRegistryOf<TWidget> {
  /** Named by a caller writing `as`, which beats every other rule. */
  readonly byName?: Readonly<Record<string, TWidget>>;
  /** Keyed by DECLARED path, so one entry serves every row of a list. */
  readonly byPath?: Readonly<Record<string, TWidget>>;
  /** Keyed by the constraint a vendor named, such as `email` or `date-time`. */
  readonly byFormat?: Readonly<Record<string, TWidget>>;
  /** Used when the field is closed, whatever its kind. */
  readonly choices?: TWidget;
  readonly byKind?: Readonly<Partial<Record<FormFieldKind, TWidget>>>;
  /** Drawn when nothing else matched, including for an unknown kind. */
  readonly fallback?: TWidget;
}
