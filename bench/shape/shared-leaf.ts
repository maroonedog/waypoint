// ===========================================================================
// shared-leaf.ts — the DOM every subject renders.
//
// The label, the input, the invalid attribute and the message node are owned
// here, so no subject can be cheaper because it renders less. A subject
// supplies values and handlers and nothing else, and assert-dom-shape-matches
// hashes the result to prove it.
//
// Written with createElement rather than JSX: the benchmark runs under Node's
// type stripping, which loads a .tsx file as plain JavaScript and throws.
// ===========================================================================
import { createElement as h, type ReactElement, type Ref } from "react";

export interface SharedLeafProps {
  readonly label: string;
  readonly name: string;
  /** Controlled subjects pass this. */
  readonly value?: string;
  /** Uncontrolled subjects pass these two instead. */
  readonly defaultValue?: string;
  readonly inputRef?: Ref<HTMLInputElement>;
  onInput?(event: { readonly currentTarget: HTMLInputElement }): void;
  onChange?(event: { readonly currentTarget: HTMLInputElement }): void;
  onBlur?(): void;
  readonly invalid: boolean;
  readonly message?: string | undefined;
}

export function SharedLeaf(props: SharedLeafProps): ReactElement {
  const inputProps: Record<string, unknown> = {
    name: props.name,
    type: "text",
    "aria-invalid": props.invalid,
    "data-path": props.name,
  };
  if (props.value !== undefined) inputProps["value"] = props.value;
  if (props.defaultValue !== undefined) {
    inputProps["defaultValue"] = props.defaultValue;
  }
  if (props.inputRef !== undefined) inputProps["ref"] = props.inputRef;
  if (props.onInput !== undefined) inputProps["onInput"] = props.onInput;
  if (props.onChange !== undefined) inputProps["onChange"] = props.onChange;
  if (props.onBlur !== undefined) inputProps["onBlur"] = props.onBlur;

  return h(
    "label",
    { "data-leaf": props.name },
    h("span", null, props.label),
    h("input", inputProps),
    h(
      "em",
      { "data-message": props.name },
      props.message === undefined ? "" : props.message
    )
  );
}
