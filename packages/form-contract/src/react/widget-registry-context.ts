// ===========================================================================
// widget-registry-context.ts — the widgets a subtree draws with.
//
// Empty by default rather than absent, so a form that uses layer 3 only never
// has to supply one and no code has to branch on whether a registry exists.
// ===========================================================================
import { createContext } from "react";
import type { WidgetRegistry } from "./widget-registry.types.js";

export const EMPTY_REGISTRY: WidgetRegistry = Object.freeze({});

export const WidgetRegistryContext =
  createContext<WidgetRegistry>(EMPTY_REGISTRY);
