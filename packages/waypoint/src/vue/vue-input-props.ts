// ===========================================================================
// vue-input-props.ts — the shared bag, filed under the key Vue binds to the
// right event, and the reduction of a DOM event that the shared builder reads.
//
// `../dom/build-input-props.ts` reads three members off whatever it is handed
// — `target.value`, `target.checked`, `target.files` — and nothing else. A DOM
// `Event` carries all three on `target` when the control is an `<input>`, but
// `Event.target` is an `EventTarget`, which declares none of them. So the
// reduction is built here, by asking the target what it has rather than by
// asserting what it is: `instanceof HTMLInputElement` would need that
// constructor to be a global, which is exactly the assumption that breaks a
// binding under a test environment or a second document.
//
// A `<textarea>` and a `<select>` answer only on `value`, and the reduction
// says so by omitting the other two — which is what the `"checked" in target`
// and `"files" in target` branches over in the shared builder are reading.
// ===========================================================================
import type {
  FieldChangeEventLike,
  FieldInputPropsOf,
} from "../dom/field-binding.types.js";
import type { FieldInputProps } from "./field-binding.types.js";

/**
 * A file input's `files`, or null for anything that is not one. The member is
 * reached structurally and then named, because `FileList` is a constructor
 * this layer deliberately does not require to exist.
 */
const fileListOf = (held: unknown): FileList | null =>
  typeof held === "object" && held !== null && "item" in held
    ? (held as FileList)
    : null;

/** What the shared builder reads, taken off a DOM event's target. */
export function changeEventLike(event: Event): FieldChangeEventLike {
  const target = event.target;
  if (target === null) return { target: { value: "" } };
  const value =
    "value" in target && typeof target.value === "string" ? target.value : "";
  if (!("checked" in target) || typeof target.checked !== "boolean") {
    return { target: { value } };
  }
  return {
    target: {
      value,
      checked: target.checked,
      files: fileListOf("files" in target ? target.files : null),
    },
  };
}

/**
 * @returns the shared bag with its change handler under `onInput`.
 *
 * See field-binding.types.ts for why the key changes and why `onChange` is not
 * emitted beside it.
 */
export function vueInputProps(
  bag: FieldInputPropsOf<FieldChangeEventLike>
): FieldInputProps {
  const { onChange, ...rest } = bag;
  return {
    ...rest,
    onInput: (event: Event) => onChange(changeEventLike(event)),
  };
}
