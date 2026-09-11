// ===========================================================================
// bench-api.types.ts — the only thing the driver and the page agree on.
//
// The driver is a Node process talking CDP; the page is a bundle. They share
// no module, so the surface between them is written down once, here, and both
// sides import it for its types only. Nothing crosses it but JSON.
// ===========================================================================

export type InjectionPosition = "synchronous" | "microtask" | "macrotask";

export interface SampleResult {
  /** The mark names the driver looks for in the trace. */
  readonly beginMark: string;
  readonly endMark: string;
  readonly keystrokes: number;
  /** From the same wrapper that produces validatorPasses in the counts lane. */
  readonly validatorPasses: number;
  /** How many of those ran inside the input dispatch, measured not declared. */
  readonly validatorPassesInsideDispatch: number;
  readonly validatorMicroseconds: number;
}

export interface PageFacts {
  readonly crossOriginIsolated: boolean;
  /** The smallest non-zero performance.now() step this page can see, in µs. */
  readonly clockTickMicroseconds: number;
  readonly userAgent: string;
  readonly devicePixelRatio: number;
  readonly hardwareConcurrency: number;
}

export interface SubjectFact {
  readonly id: string;
  readonly library: string;
  readonly policy: string;
  readonly treeClass: string;
  readonly notes: string;
}

export interface ShapeFact {
  readonly id: string;
  readonly leaves: number;
}

export interface BenchApi {
  facts(): PageFacts;
  /**
   * The subjects and the shapes the BUNDLE holds, so the driver never keeps a
   * second list that can drift out of step with the one being measured.
   */
  subjects(): readonly SubjectFact[];
  shapes(): readonly ShapeFact[];
  /** Warms the zod instance itself, before any subject is given a turn. */
  warmSchema(shapeId: string): void;
  mount(subjectId: string, shapeId: string): Promise<void>;
  unmount(): void;
  warm(milliseconds: number): Promise<void>;
  run(sampleId: string, keystrokes: number): Promise<SampleResult>;
  injectCost(milliseconds: number, position: InjectionPosition): void;
  clearInjectedCost(): void;
  /** The rendered leaf count, so the driver can prove the page is the shape. */
  renderedLeaves(): number;
}

declare global {
  interface Window {
    __bench?: BenchApi;
  }
}
