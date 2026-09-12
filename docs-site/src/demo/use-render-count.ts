// ===========================================================================
// use-render-count.ts — how many times the calling component has rendered.
//
// A ref rather than state, because reading it must not itself cause a render:
// the number would then be measuring the instrument.
// ===========================================================================
import { useRef } from "react";

export function useRenderCount(): number {
  const renders = useRef(0);
  renders.current += 1;
  return renders.current;
}
