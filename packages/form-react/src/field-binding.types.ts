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
import type { ChangeEvent } from "react";
import type { FormFieldDescriptor, FormIssue } from "form-contract";

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
  validate(): readonly FormIssue[];
  /** Judges a value that is NOT in the store and writes nothing. */
  check(candidate: unknown): readonly FormIssue[];
  readonly inputProps: FieldInputProps;
}
