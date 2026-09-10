import { useRef } from "react";

/**
 * How many times the calling component has rendered.
 *
 * A ref rather than state: reading it must not itself cause a render, or the
 * number would be measuring the instrument.
 */
export function useRenderCount(): number {
  const renders = useRef(0);
  renders.current += 1;
  return renders.current;
}
