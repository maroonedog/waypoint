// ===========================================================================
// read-observable-state.ts — what the document is showing.
//
// The whole agreement gate stands on this one function reading nothing but
// the DOM. The moment it reaches into a library to ask what it thinks, the
// comparison stops being about the form and starts being about whose API is
// easier to interrogate.
// ===========================================================================
import type { ObservableState } from "./verdict.types.ts";

export function readObservableState(container: Element): ObservableState {
  const values = new Map<string, string>();
  const messages = new Map<string, string>();
  const invalidPaths = new Set<string>();

  for (const node of Array.from(container.querySelectorAll("[data-path]"))) {
    const input = node as HTMLInputElement;
    const path = input.getAttribute("data-path");
    if (path === null) continue;
    values.set(path, input.value);
    if (input.getAttribute("aria-invalid") === "true") invalidPaths.add(path);
  }

  for (const node of Array.from(container.querySelectorAll("[data-message]"))) {
    const path = node.getAttribute("data-message");
    const text = (node.textContent ?? "").trim();
    if (path !== null && text !== "") messages.set(path, text);
  }

  return { values, messages, invalidPaths };
}
