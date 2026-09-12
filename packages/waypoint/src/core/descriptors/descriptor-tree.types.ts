// ===========================================================================
// descriptor-tree.types.ts — the shape a renderer walks.
//
// The descriptor list is leaves only: a vendor describes the fields a person
// fills in, and a container is not one. A renderer that draws the whole form
// needs the containers back, so the tree carries them — derived, never
// declared.
//
// Every path here is DECLARED. Binding a list to its rows is the renderer's
// job, and a tree that already carried indices could only describe one render.
// ===========================================================================
import type { FormFieldDescriptor } from "../../contract/index.js";

export interface DescriptorFieldNode {
  readonly kind: "field";
  readonly path: string;
  readonly descriptor: FormFieldDescriptor;
}

export interface DescriptorGroupNode {
  readonly kind: "group";
  readonly path: string;
  readonly children: readonly DescriptorNode[];
}

export interface DescriptorListNode {
  readonly kind: "list";
  /** The array itself, so array-level issues are read from here. */
  readonly path: string;
  /** What one row holds, addressed through the wildcard. */
  readonly children: readonly DescriptorNode[];
}

export type DescriptorNode =
  | DescriptorFieldNode
  | DescriptorGroupNode
  | DescriptorListNode;
