// ===========================================================================
// field-binding.types.ts — what a children function receives.
//
// `inputProps` is offered and never required. A layer-3 caller is free to
// spell its own attributes off `descriptor.constraints`; the point of layer 3
// is that this library stops having opinions there.
//
// `onChange` takes a real React event rather than a narrowed
// `{ target: { value } }`. Narrowing it removes `nativeEvent.isComposing`,
// which is the one thing an IME-aware caller needs.
// ===========================================================================
import type { ChangeEvent, RefObject } from "react";
import type {
  FormFieldDescriptor,
  FormIssue,
  MaybeAsync,
} from "form-contract";

export type FieldChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

export interface FieldInputProps {
  readonly name: string;
  readonly value: string | number;
  onChange(event: FieldChangeEvent): void;
  onBlur(): void;
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly step?: number;
  readonly pattern?: string;
}

export interface FieldBinding<TValue> {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly value: TValue | undefined;
  /** Never undefined; the empty list is interned, so it is reference-stable. */
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
  readonly inputProps: FieldInputProps;
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
  onChange(event: { readonly currentTarget: { readonly value: string } }): void;
  onBlur(): void;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  validate(): MaybeAsync<readonly FormIssue[]>;
  issuesFor(candidate: unknown): MaybeAsync<readonly FormIssue[]>;
}
