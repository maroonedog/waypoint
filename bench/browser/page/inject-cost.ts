// ===========================================================================
// inject-cost.ts — a known cost, placed where a real runtime would put one.
//
// This is how the harness publishes its own resolution. A ladder that only
// burns time synchronously inside the handler proves resolution for the one
// cost shape the headline metric already sees best — and form-contract does
// not have that shape: it coalesces its pass to a microtask. So the same
// ladder is injected at three scheduling positions, and the report prints what
// was resolved at each, including the positions where the answer is "nothing".
//
// The burn is a busy loop on performance.now() rather than a sleep: a sleep
// yields the thread and would be invisible to every metric here, which would
// make the ladder measure the harness's patience instead of its resolution.
// ===========================================================================
import type { InjectionPosition } from "./bench-api.types.ts";

const burn = (milliseconds: number): void => {
  if (milliseconds <= 0) return;
  const until = performance.now() + milliseconds;
  while (performance.now() < until) {
    // Spinning is the point: a sleep would yield the thread and be invisible.
  }
};

let installed: ((event: Event) => void) | undefined;

/**
 * Installs one capturing `input` listener on the window. Capturing, and on the
 * window, so it runs inside the SAME EventDispatch as the subject's own
 * handler at the synchronous position — anywhere else and the ladder would be
 * calibrating a different trace event than the one it is calibrating for.
 */
export function injectCost(
  milliseconds: number,
  position: InjectionPosition
): void {
  clearInjectedCost();
  const listener = (): void => {
    if (position === "synchronous") burn(milliseconds);
    else if (position === "microtask") {
      void Promise.resolve().then(() => burn(milliseconds));
    } else setTimeout(() => burn(milliseconds), 0);
  };
  window.addEventListener("input", listener, true);
  installed = listener;
}

export function clearInjectedCost(): void {
  if (installed === undefined) return;
  window.removeEventListener("input", installed, true);
  installed = undefined;
}
