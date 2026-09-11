// ===========================================================================
// jsdom-environment.ts — the DOM every subject renders into.
//
// One document for the whole run, and one container per mount, so no subject
// inherits another's nodes. jsdom is not a rendering engine: it does no
// layout and no paint, which is exactly why this lane publishes counts and
// never milliseconds.
// ===========================================================================
import { JSDOM } from "jsdom";

export interface BenchDom {
  readonly window: JSDOM["window"];
  readonly document: Document;
  newContainer(): HTMLElement;
}

let installed: BenchDom | undefined;

export function installJsdom(): BenchDom {
  if (installed !== undefined) return installed;

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  const anyGlobal = globalThis as unknown as Record<string, unknown>;
  anyGlobal["window"] = dom.window;
  anyGlobal["document"] = dom.window.document;
  anyGlobal["HTMLElement"] = dom.window.HTMLElement;
  anyGlobal["Event"] = dom.window.Event;
  anyGlobal["Node"] = dom.window.Node;
  anyGlobal["MutationObserver"] = dom.window.MutationObserver;
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: dom.window.navigator,
      configurable: true,
    });
  } catch {
    // A navigator the host already provided is fine.
  }
  // React needs this to accept act(); nothing here uses act, but the flag also
  // suppresses the warning that would otherwise be the only output.
  anyGlobal["IS_REACT_ACT_ENVIRONMENT"] = true;

  installed = {
    window: dom.window,
    document: dom.window.document,
    newContainer() {
      const container = dom.window.document.createElement("div");
      dom.window.document.body.appendChild(container);
      return container;
    },
  };
  return installed;
}
