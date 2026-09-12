// ===========================================================================
// subject.types.ts — what a library has to provide to be measured.
//
// A subject provides a component and two escape hatches, and nothing else. It
// does not count anything and it does not report anything: every number in the
// report is taken by the harness from the fiber tree, the DOM or the shared
// schema wrapper, so there is no counter an adapter author could place
// favourably.
//
// `policy` is declared, not inferred. Three of the four competitors ship a
// default that claims a verdict at a different moment than waypoint does,
// and scoring them against waypoint's moment would report a documented
// design choice as a disagreement.
// ===========================================================================
import type { ComponentType } from "react";
import type { LeafProps } from "../shape/shared-skeleton.ts";
import type { MountContext } from "./mount-context.types.ts";

/** When a subject claims to have a verdict. */
export type ValidationPolicy = "on-change" | "on-blur" | "on-submit";

/**
 * A tree class. `equal-tree` renders the shared leaf with no boundary of its
 * own and is fiber-comparable with every other `equal-tree` subject;
 * `own-tree` renders an extra boundary its idiom requires, and publishes the
 * difference rather than hiding it.
 */
export type TreeClass = "equal-tree" | "own-tree";

export interface MountedSubject {
  /** Writes through the library's OWN api, for the liveness canary only. */
  setValue(path: string, value: unknown): void;
  /** Reads back through the library's OWN getter, for the same canary. */
  readValue(path: string): unknown;
  /**
   * Attempts a submit. Read at a designated, UNTIMED observation point: it is
   * how a subject whose policy is on-submit is asked for its verdict, and its
   * cost is never charged to the interaction that preceded it.
   */
  submit(): Promise<void>;
  unmount(): void;
}

export interface Subject {
  readonly id: string;
  readonly library: string;
  readonly treeClass: TreeClass;
  readonly policy: ValidationPolicy;
  /**
   * What this subject can do, named in a shared vocabulary. Every subject must
   * contribute at least one capability the others lack, which is what stops
   * the capability axis from being a list of the competitors' shortcomings.
   */
  readonly capabilities: readonly string[];
  /** Written by whoever wrote the subject, and printed beside its rows. */
  readonly notes: string;
  /**
   * Where the library documents the policy it ships. Printed beside a
   * `by design` cell so the reader can check it rather than take our word.
   */
  readonly policyCitation: string;
  readonly Leaf: ComponentType<LeafProps>;
  mount(container: HTMLElement, context: MountContext): MountedSubject;
}
