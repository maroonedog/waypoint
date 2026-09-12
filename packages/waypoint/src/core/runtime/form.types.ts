// ===========================================================================
// form.types.ts — what a form and one of its fields offer.
//
// A field handle is addressed by path and never by React tree position, which
// is what lets the same field be read from a portal, a lazy chunk or a test
// with no component at all.
// ===========================================================================
import type {
  ConcretePath,
  DeclaredOf,
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
  InhabitedPath,
  MaybeAsync,
  ValueAtPath,
} from "../../contract/index.js";
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
  validate(): MaybeAsync<readonly FormIssue[]>;
  /** The issues this path would carry if its value were `candidate`. */
  issuesFor(candidate: unknown): MaybeAsync<readonly FormIssue[]>;
}

/**
 * When a VALUE EDIT asks for a pass. `"change"` is the default, and is what
 * this runtime did before the option existed.
 *
 * It governs value edits and nothing else. `reset`, `setParticipating` and a
 * row edit still judge under every setting, because each of them changes WHICH
 * issues block rather than what one value is — and leaving `errorCount`
 * describing a shape that no longer exists is a different defect from delaying
 * a message about a value.
 *
 * AFTER A REJECTED SUBMIT, EVERY SETTING RE-JUDGES ON CHANGE. Once
 * `submitCount > 0` a value edit asks for a pass whatever this says, because
 * the alternative is a person fixing the field the form just complained about
 * and watching the complaint stay. That is the defect react-hook-form's
 * `reValidateMode` exists for, and here it costs one cell read.
 */
export type FormValidationMoment = "change" | "blur" | "submit";

export interface FormOptions<T, TPath extends string> {
  readonly adapter: FormAdapter<T, TPath>;
  /**
   * Which registered form this is — the name a path qualifies itself with.
   *
   * It reaches the runtime for ONE purpose: a diagnostic quotes the path the
   * caller wrote, and after qualification that spelling includes this. Nothing
   * here addresses a value with it and nothing here compares it; `./core`
   * neither has a registry nor wants one.
   *
   * Omitting it costs the prefix in those messages and nothing else.
   */
  readonly key?: string;
  readonly defaultValues?: unknown;
  /** Omit for the shipped store. Anything passing the contract fits here. */
  readonly store?: FormCellStore;
  /**
   * Defaults to `"change"`.
   *
   * ON THE FORM, NEVER PER FIELD, and that is a fact about this architecture
   * rather than a smaller first version. One pass judges the whole root, so a
   * field set to `"blur"` would be re-judged the moment any OTHER field
   * changed — there is no per-field pass to gate. A per-field knob here would
   * be a promise the runtime cannot keep.
   */
  readonly validateOn?: FormValidationMoment;
}

export interface FormHandle<T, TPath extends string = string> {
  /**
   * The name this form was created under, when it was given one — what a
   * provider publishes so the key a path names has one source rather than two
   * that can drift.
   */
  readonly key: string | undefined;
  readonly descriptors: readonly FormFieldDescriptor[];
  /** The containers the descriptors imply, in declaration order. */
  readonly tree: readonly DescriptorNode[];
  readonly store: FormCellStore;
  /**
   * How many issues blocked a submit AS OF THE LAST PASS; a dormant subtree is
   * excluded.
   *
   * "As of the last pass" is load-bearing under `validateOn`. On the default
   * `"change"` a pass follows every edit, so the count is never more than a
   * microtask behind. Under `"blur"` it describes the form as it was at the
   * last blur, and under `"submit"` it is 0 until the first submit — so the
   * disabled-button idiom built on `useFormStatus` is a statement about the
   * last verdict rather than about what would happen if you pressed it now.
   */
  readonly errorCount: CellSource<number>;
  /**
   * The issues `errorCount` is the LENGTH of — the same list, published by the
   * same call, so no arrangement of readers can catch the two describing
   * different passes.
   *
   * It is the live counterpart of `SubmitOutcome.blockedBy`, and the name is
   * deliberately the same: that one is the snapshot one attempt was refused
   * by, this one is what would refuse an attempt made now. Both carry an issue
   * on a path no descriptor declares and no component draws, which is the case
   * an error summary exists for — `useErrorSummary` reads this.
   *
   * Compared by content before it is written and interned when empty, so a
   * form nothing is wrong with hands back the same array for ever and a
   * subscriber is woken only when the verdict actually moves.
   */
  readonly blockedBy: CellSource<readonly FormIssue[]>;
  readonly submitting: CellSource<boolean>;
  readonly submitCount: CellSource<number>;
  readonly validating: CellSource<boolean>;
  /** Judges everything, then hands the root over only if nothing blocks. */
  submit(handler: SubmitHandler): Promise<SubmitOutcome>;
  /**
   * Takes ownership of issues the validator could not produce — what a server
   * said after a submit. **This is the `setError` of this library**, and the
   * name is different because the behaviour is: the runtime does not merely
   * display these, it OWNS them. They are merged into every pass, so they land
   * on their fields, they are counted by `errorCount`, they appear in
   * `blockedBy`, and they are dropped again without anybody asking.
   *
   * Each call replaces the whole adopted set, so `adoptIssues([])` clears it.
   * A path with no component is fine, and is the interesting case: an issue on
   * `payment` refuses a submit whether or not anything is drawing it, and
   * `blockedBy` says so.
   *
   * Dropped at four moments, every one of them necessary:
   *
   * 1. a write at the path, at any ancestor of it, or at any descendant —
   *    "this row is a duplicate" does not survive an edit inside the row, and
   *    "this applicant already exists" does not survive an edit to their email;
   * 2. the END of the next `submit()`, which that attempt has already been
   *    refused by. One press is refused and told why; the next press asks the
   *    server again. Without this an issue on a path nobody can type into
   *    could never be cleared at all, and a button disabled on `errorCount`
   *    would have made the one act that clears it unreachable;
   * 3. `reset()`;
   * 4. a row move, which re-addresses rather than drops.
   */
  adoptIssues(issues: readonly FormIssue[]): void;
  /**
   * Whether a path, and everything under it, blocks a submit. Values stay in
   * the store either way, so cross-field rules go on reading them.
   */
  setParticipating(path: string, participating: boolean): void;
  /** Back to the supplied defaults, or to the ones the form was made with. */
  reset(defaultValues?: unknown): void;
  /**
   * One field, addressed by the PLACE it occupies. A declared path carries
   * `[*]`, a place carries an index, and this takes the second — which is what
   * the runtime has always required, since `assertConcretePath` is the first
   * thing it reaches. The type used to take EITHER, so the rule spelling
   * type-checked and then threw. The value type is still computed from the
   * rule, because that is what ValueAtPath descends through.
   *
   * `InhabitedPath` is the second half of the parameter and catches what the
   * union cannot: a path below a `Record<string, T>` key, where the union has
   * widened to a template that absorbs everything under it.
   */
  field<K extends ConcretePath<TPath>>(
    path: K & InhabitedPath<T, K>
  ): FieldHandle<ValueAtPath<T, DeclaredOf<K>>>;
  /**
   * The row order of one array, and the three edits that change it. Addressed
   * by a concrete path, so an array nested in a row is reached by binding the
   * outer row first.
   */
  rows(arrayPath: string): RowsHandle;
  readRoot(): unknown;
  /** Judges the whole root now and writes the verdict back. */
  validate(): MaybeAsync<readonly FormIssue[]>;
}
