// ===========================================================================
// form.types.ts — what a form and one of its fields offer.
//
// A field handle is addressed by path and never by React tree position, which
// is what lets the same field be read from a portal, a lazy chunk or a test
// with no component at all.
// ===========================================================================
import type {
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
  ValueAtPath,
} from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import type { CellSource } from "./cell-source.js";
import type { RowsHandle } from "./create-rows-handle.js";
import type { DescriptorNode } from "../descriptors/descriptor-tree.types.js";
import type { SubmitHandler, SubmitOutcome } from "./submit-form.js";

/** The channels a field publishes, each subscribed to separately. */
export interface FieldSources<TValue> {
  readonly value: CellSource<TValue | undefined>;
  readonly issues: CellSource<readonly FormIssue[]>;
  readonly touched: CellSource<boolean>;
  readonly dirty: CellSource<boolean>;
  readonly participating: CellSource<boolean>;
}

export interface FieldHandle<TValue> {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly sources: FieldSources<TValue>;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  /**
   * Whether this field, and everything under it, blocks a submit. The value
   * stays in the store either way, so a cross-field rule goes on reading it.
   */
  setParticipating(participating: boolean): void;
  /** Judges the whole root, writes the verdict back, returns this path's part. */
  validate(): readonly FormIssue[];
  /** Judges a value that is NOT in the store, and writes nothing. */
  check(candidate: unknown): readonly FormIssue[];
}

export interface FormOptions<T, TPath extends string> {
  readonly adapter: FormAdapter<T, TPath>;
  readonly defaultValues?: unknown;
  /** Omit for the shipped store. Anything passing the contract fits here. */
  readonly store?: FormCellStore;
}

export interface FormHandle<T, TPath extends string = string> {
  readonly descriptors: readonly FormFieldDescriptor[];
  /** The containers the descriptors imply, in declaration order. */
  readonly tree: readonly DescriptorNode[];
  readonly store: FormCellStore;
  /** How many issues currently block a submit; a dormant subtree is excluded. */
  readonly errorCount: CellSource<number>;
  readonly submitting: CellSource<boolean>;
  readonly submitCount: CellSource<number>;
  readonly validating: CellSource<boolean>;
  /** Judges everything, then hands the root over only if nothing blocks. */
  submit(handler: SubmitHandler): Promise<SubmitOutcome>;
  /**
   * Whether a path, and everything under it, blocks a submit. Values stay in
   * the store either way, so cross-field rules go on reading them.
   */
  setParticipating(path: string, participating: boolean): void;
  /** Back to the supplied defaults, or to the ones the form was made with. */
  reset(defaultValues?: unknown): void;
  field<K extends TPath>(path: K): FieldHandle<ValueAtPath<T, K>>;
  /**
   * The row order of one array, and the three edits that change it. Addressed
   * by a concrete path, so an array nested in a row is reached by binding the
   * outer row first.
   */
  rows(arrayPath: string): RowsHandle;
  readRoot(): unknown;
  /** Judges the whole root now and writes the verdict back. */
  validate(): readonly FormIssue[];
}
