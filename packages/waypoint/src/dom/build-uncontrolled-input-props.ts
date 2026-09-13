// ===========================================================================
// build-uncontrolled-input-props.ts — the same bag, for a node-held value.
//
// A FILE NO FRAMEWORK OWNS. Its one framework type was `RefObject`, and
// React's `RefObject<T>` is `{ current: T }` and nothing else — see the header
// of ./field-binding.types.ts — so the ref position is `FieldRefObject<T>` and
// a React binding's own `useRef` result still satisfies it.
//
// The uncontrolled binding is the one the benchmark tells people to reach
// for, and it used to return no props at all: a caller who took the advice had
// to spell `name`, `required`, `min`, `max`, `minLength`, `maxLength`, `step`
// and `pattern` out of `descriptor.constraints` by hand, so the fastest
// binding was also the one that made the descriptor useless. It now emits
// everything the controlled one does, from the same function, and differs only
// where it has to.
//
// Where it has to is the value: `ref` and a default instead of `value`, so the
// node owns what is in the box and nothing is woken to redraw it. That is
// also why a boolean gets `defaultChecked` rather than `defaultValue` —
// `defaultValue="true"` on a checkbox sets the string value of a box that is
// still unticked, which is the quiet wrong answer rather than a loud one.
//
// A FILE GETS NEITHER DEFAULT. `<input type="file">` is the one element whose
// value may only ever be assigned the empty string, so `defaultValue` on it is
// a string the DOM will not take — and there is nothing for it to mean, since
// a file nobody has picked is a file the page does not have. This binding is
// already the arrangement where the node owns the value, which is how a file
// input works whether or not anybody asked, so it needs no third shape here.
// ===========================================================================
import type { FormFieldDescriptor, FormIssue } from "../contract/index.js";
import type {
  FieldRefObject,
  UncontrolledChangeEvent,
  UncontrolledInputProps,
} from "./field-binding.types.js";
import type { FieldElementIds } from "./field-element-ids.js";
import { sharedInputAttributes } from "./input-attributes.js";

export interface UncontrolledInputPropsRequest {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly issues: readonly FormIssue[];
  readonly ids: FieldElementIds;
  readonly ref: FieldRefObject<HTMLInputElement | null>;
  /** Read from the cell at render, never subscribed to. */
  readonly held: unknown;
  /** The same string the binding's own `defaultValue` carries, so the two
   *  cannot come to disagree about what an empty cell displays as. */
  readonly defaultValue: string;
  readonly onChange: (event: UncontrolledChangeEvent) => void;
  readonly onBlur: () => void;
}

export function buildUncontrolledInputProps(
  request: UncontrolledInputPropsRequest
): UncontrolledInputProps {
  const { descriptor, ids, issues } = request;
  const shared = sharedInputAttributes({
    path: request.path,
    descriptor,
    ids,
    hasIssues: issues.length > 0,
  });
  const value =
    descriptor?.kind === "file"
      ? {}
      : descriptor?.kind === "boolean"
        ? { defaultChecked: request.held === true }
        : { defaultValue: request.defaultValue };
  return {
    ...shared,
    ...value,
    ref: request.ref,
    onChange: request.onChange,
    onBlur: request.onBlur,
  };
}
