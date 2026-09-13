// ===========================================================================
// field-binding.types.ts — the shared binding, with Vue's two blanks filled
// in, and the one member that could not be shared.
//
// `../dom/field-binding.types.ts` states what a wired field is without naming
// a framework. Two of its type parameters are Vue's to supply: the event a
// handler receives is the DOM's own `Event`, and the element `decorate`
// returns is a `VNode`.
//
// THE THIRD DIFFERENCE IS NOT A TYPE PARAMETER AND IS THE ONE THAT BITES.
// React's `onChange` is not the DOM's `change` event — React wires it to
// `input`, so it fires on every keystroke. Vue's prop of that name IS the DOM
// event, which fires on commit or blur. A field wired with React's spelling in
// a Vue template renders perfectly, passes any snapshot of its attributes, and
// writes its cell only when the control loses focus — so `showIssues: "dirty"`
// never opens, a number field's typing transient never happens, and the whole
// thing reads as a debounce somebody added rather than as a defect.
//
// So the bag this entry hands out carries `onInput`, which is the Vue prop
// that means what React's `onChange` means. The handler itself is the one
// `../dom/build-input-props.ts` built; only the key it is filed under changes.
// `onChange` is deliberately NOT also emitted: a browser fires `input` and
// then `change` for a select and a checkbox, and binding both would write the
// cell twice for one edit.
// ===========================================================================
import type { VNode } from "vue";
import type {
  FieldBindingOf,
  FieldInputPropsOf,
} from "../dom/field-binding.types.js";

/**
 * Spreadable onto an `<input>`, a `<textarea>` or a `<select>` with
 * `v-bind`. Everything `../dom` declared, with the change handler under the
 * key Vue binds to the `input` event.
 */
export type FieldInputProps = Omit<
  FieldInputPropsOf<Event>,
  "onChange"
> & {
  onInput(event: Event): void;
};

export interface FieldBinding<TValue>
  extends Omit<FieldBindingOf<TValue, Event, VNode>, "inputProps"> {
  readonly inputProps: FieldInputProps;
}
