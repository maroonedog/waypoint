// ===========================================================================
// field-binding.types.ts — the React half of what a children function
// receives, and nothing else.
//
// The shapes moved to `../dom/field-binding.types.ts`, where they name no
// framework. What is left here is the two React types that could not go with
// them — `ChangeEvent`, which is a SyntheticEvent, and `ReactElement`, which is
// React's node — filled into the parameters the shared file left open.
//
// Every name below keeps the spelling and the meaning it had, so nothing
// outside the package changes. `FieldBinding<T>` is still what `useField`
// returns and `FieldInputProps` is still what spreads onto an `<input>`; they
// are stated in two files now instead of one.
//
// `onChange` takes a real React event rather than a narrowed
// `{ target: { value } }`. Narrowing it removes `nativeEvent.isComposing`,
// which is the one thing an IME-aware caller needs — and it is why
// `FieldInputProps` is parameterised at all rather than shared outright.
// ===========================================================================
import type { ChangeEvent, ReactElement } from "react";
import type {
  FieldBindingOf,
  FieldInputPropsOf,
  UncontrolledFieldBindingOf,
} from "../dom/field-binding.types.js";

export type {
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
  FieldPart,
  UncontrolledChangeEvent,
  UncontrolledInputProps,
} from "../dom/field-binding.types.js";

export type FieldChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

export type FieldInputProps = FieldInputPropsOf<FieldChangeEvent>;

export type FieldBinding<TValue> = FieldBindingOf<
  TValue,
  FieldChangeEvent,
  ReactElement
>;

export type UncontrolledFieldBinding<TValue> = UncontrolledFieldBindingOf<
  TValue,
  ReactElement
>;
