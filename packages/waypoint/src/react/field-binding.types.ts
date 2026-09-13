// ===========================================================================
// field-binding.types.ts — what a children function receives.
//
// `inputProps` is offered and never required. A layer-3 caller is free to
// spell its own attributes off `descriptor.constraints`; the point of layer 3
// is that this library stops having opinions there. What changed is what the
// offer is worth: a bag that emitted `minlength` and no `id`, no `type` and
// nothing a screen reader reads left every caller to hand-write the half that
// is hardest to get right, which made the library's own first sentence — that
// a renderer knows what a field accepts before anyone types in it — true only
// of the easy half.
//
// The label, description and error bags are separate rather than folded into
// `inputProps` because they go on three other elements. A caller that spreads
// all four has a wired field; a caller that spreads one has exactly the one it
// asked for.
//
// `onChange` takes a real React event rather than a narrowed
// `{ target: { value } }`. Narrowing it removes `nativeEvent.isComposing`,
// which is the one thing an IME-aware caller needs.
// ===========================================================================
import type { ChangeEvent, ReactElement, RefObject } from "react";
import type {
  FormFieldDescriptor,
  FormIssue,
  MaybeAsync,
} from "../contract/index.js";

/**
 * Which of the four elements a bag belongs on. `decorate` takes it so that
 * one function covers all four rather than four functions covering one each,
 * and the default is the one a caller reaches for nine times in ten.
 */
export type FieldPart = "input" | "label" | "description" | "error";

export type FieldChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

/**
 * Enough of a change event for the uncontrolled binding to read a node.
 *
 * `files` is the third channel a node can answer on, and it is here for the
 * same reason `checked` is: a file input's `value` is a fake path string and
 * reading it would put `"C:\\fakepath\\photo.png"` in the cell.
 */
export interface UncontrolledChangeEvent {
  readonly currentTarget: {
    readonly value: string;
    readonly checked?: boolean;
    readonly files?: FileList | null;
  };
}

/** Goes on the `<label>`. */
export interface FieldLabelProps {
  readonly htmlFor: string;
}

/** Goes on the help line. Handed out only when there is one to draw. */
export interface FieldDescriptionProps {
  readonly id: string;
}

/** Goes on the element that carries this field's messages. */
export interface FieldErrorProps {
  readonly id: string;
  readonly role: "alert";
}

/**
 * Spreadable onto an `<input>`, a `<textarea>` or a `<select>`. At most one of
 * `value` and `checked` is present: a checkbox carries neither a value the
 * person typed nor one React can control it by, and giving it both is how a
 * checkbox ends up ignoring clicks. A `file` field carries NEITHER — it is the
 * one input React cannot control at all, so the node holds what was picked and
 * the cell is written from the change event.
 */
export interface FieldInputProps {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly value?: string | number;
  readonly checked?: boolean;
  onChange(event: FieldChangeEvent): void;
  onBlur(): void;
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly step?: number;
  readonly pattern?: string;
  readonly "aria-invalid"?: true;
  readonly "aria-describedby"?: string;
}

/**
 * The same bag for a field whose value lives in the node: `ref` and a default
 * where the controlled one has `value`, and everything the descriptor says
 * unchanged, because what a field accepts does not depend on who holds it.
 */
export interface UncontrolledInputProps {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly defaultValue?: string;
  readonly defaultChecked?: boolean;
  onChange(event: UncontrolledChangeEvent): void;
  onBlur(): void;
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly step?: number;
  readonly pattern?: string;
  readonly "aria-invalid"?: true;
  readonly "aria-describedby"?: string;
}

export interface FieldBinding<TValue> {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly value: TValue | undefined;
  /**
   * What this field is willing to SAY right now — the last pass's verdict for
   * this path, gated by `showIssues`. Never undefined; the empty list is
   * interned, so it is reference-stable.
   *
   * It is not what blocks. A field waiting for its first blur publishes
   * nothing here and still refuses the submit, and `errorCount` and
   * `blockedBy` still count it.
   */
  readonly issues: readonly FormIssue[];
  readonly isTouched: boolean;
  readonly isDirty: boolean;
  readonly isParticipating: boolean;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  setParticipating(participating: boolean): void;
  /** A promise when the validator answers asynchronously. */
  validate(): MaybeAsync<readonly FormIssue[]>;
  /** The issues this field would carry if its value were `candidate`. */
  issuesFor(candidate: unknown): MaybeAsync<readonly FormIssue[]>;
  /**
   * The caller's own element, with this field's props merged into it.
   *
   * The four bags are still there and spreading them is still the shortest
   * path. This is for the element that already HAS props: a spread silently
   * drops whichever `onChange` comes second and truncates
   * `aria-describedby` to one side, and neither failure shows up anywhere.
   * Handlers and refs compose, `aria-describedby` joins, the field wins on
   * identity and on what the schema declared, and everything else is left
   * alone.
   *
   * `part` says which of the four elements this is; it defaults to the input.
   * Decorating a description where the schema declared none hands the element
   * back untouched, because there is no id for it to carry.
   */
  decorate(element: ReactElement, part?: FieldPart): ReactElement;
  readonly inputProps: FieldInputProps;
  readonly labelProps: FieldLabelProps;
  /** Undefined when the schema declared no description. */
  readonly descriptionProps: FieldDescriptionProps | undefined;
  readonly errorProps: FieldErrorProps;
}

/**
 * A field whose value lives in the DOM node rather than in React's state.
 * There is no `value` and no `isDirty`: both would have to be subscribed to
 * be correct, and subscribing to them is the cost this binding exists to
 * avoid. Read either through `useFieldValue` in a component that genuinely
 * displays it, or through the form handle.
 */
export interface UncontrolledFieldBinding<TValue> {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  /** Never undefined; the empty list is interned, so it is reference-stable. */
  readonly issues: readonly FormIssue[];
  readonly isTouched: boolean;
  readonly isParticipating: boolean;
  /** Put this on the input. The runtime writes the node through it. */
  readonly ref: RefObject<HTMLInputElement | null>;
  /** Only read at mount; React ignores it afterwards, which is intended. */
  readonly defaultValue: string;
  onChange(event: UncontrolledChangeEvent): void;
  onBlur(): void;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  validate(): MaybeAsync<readonly FormIssue[]>;
  issuesFor(candidate: unknown): MaybeAsync<readonly FormIssue[]>;
  /**
   * The caller's own element, with this field's props merged into it.
   *
   * The four bags are still there and spreading them is still the shortest
   * path. This is for the element that already HAS props: a spread silently
   * drops whichever `onChange` comes second and truncates
   * `aria-describedby` to one side, and neither failure shows up anywhere.
   * Handlers and refs compose, `aria-describedby` joins, the field wins on
   * identity and on what the schema declared, and everything else is left
   * alone.
   *
   * `part` says which of the four elements this is; it defaults to the input.
   * Decorating a description where the schema declared none hands the element
   * back untouched, because there is no id for it to carry.
   */
  decorate(element: ReactElement, part?: FieldPart): ReactElement;
  /** `ref`, the default and everything the descriptor declared, in one bag. */
  readonly inputProps: UncontrolledInputProps;
  readonly labelProps: FieldLabelProps;
  /** Undefined when the schema declared no description. */
  readonly descriptionProps: FieldDescriptionProps | undefined;
  readonly errorProps: FieldErrorProps;
}
