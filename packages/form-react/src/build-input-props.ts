// ===========================================================================
// build-input-props.ts — a descriptor's constraints as DOM attributes.
//
// A constraint that was not declared produces no attribute. Writing
// `minLength={0}` for a field with no minimum states a rule the validator does
// not hold, and the browser would then enforce something nobody declared.
//
// The value is coerced to a string because a controlled input whose value is
// undefined is an UNCONTROLLED input, and React changes its behaviour silently
// when a field switches between the two.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import type {
  FieldChangeEvent,
  FieldInputProps,
} from "./field-binding.types.js";

type MutableInputProps = {
  -readonly [K in keyof FieldInputProps]?: FieldInputProps[K];
};

export interface InputPropsRequest {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly value: unknown;
  readonly onChangeValue: (next: string) => void;
  readonly onBlur: () => void;
}

const displayValue = (value: unknown): string | number =>
  value === undefined || value === null
    ? ""
    : typeof value === "number"
      ? value
      : String(value);

export function buildInputProps(request: InputPropsRequest): FieldInputProps {
  const { descriptor } = request;
  const props: MutableInputProps = {
    name: request.path,
    value: displayValue(request.value),
    onChange: (event: FieldChangeEvent) =>
      request.onChangeValue(event.target.value),
    onBlur: request.onBlur,
    required: descriptor?.isRequired ?? false,
  };

  const constraints = descriptor?.constraints;
  if (constraints !== undefined) {
    if (constraints.minimum !== undefined) props.min = constraints.minimum;
    if (constraints.maximum !== undefined) props.max = constraints.maximum;
    if (constraints.minLength !== undefined) {
      props.minLength = constraints.minLength;
    }
    if (constraints.maxLength !== undefined) {
      props.maxLength = constraints.maxLength;
    }
    if (constraints.step !== undefined) props.step = constraints.step;
    if (constraints.pattern !== undefined) {
      props.pattern = constraints.pattern.source;
    }
  }
  return props as FieldInputProps;
}
