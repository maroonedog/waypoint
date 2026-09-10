// ===========================================================================
// field.tsx — layer 3.
//
// The children function receives the binding and returns whatever it likes.
// It is called as the return value of this component rather than invoked
// inside its body for its own bookkeeping, so nothing here decides what the
// caller may render — and passing the binding on to a child component is
// ordinary React rather than a case this library has to know about.
//
// Layer 2 arrives with the widget registry and reuses this component; the
// binding is the same object either way, so the two heights cannot diverge.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { FieldBinding } from "./field-binding.types.js";
import { useField } from "./use-field.js";

export interface FieldProps<TValue> {
  readonly path: string;
  readonly children: (binding: FieldBinding<TValue>) => ReactNode;
}

export function Field<TValue>(props: FieldProps<TValue>): ReactElement {
  const binding = useField<TValue>(props.path);
  return <>{props.children(binding)}</>;
}
