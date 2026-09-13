// ===========================================================================
// field-binding.types.ts — what a binding hands a caller, minus the framework.
//
// A FILE NO FRAMEWORK OWNS. It was split out of `../react` so that a second
// binding does not have to restate what a wired field is. Three React types
// were in the way and only two of them were really React's:
//
//   `RefObject<T>` is `interface RefObject<T> { current: T }` in @types/react
//   19.3.0 — read it at node_modules/@types/react/index.d.ts:154. A structural
//   one-member interface is not a framework's type, so `FieldRefObject<T>` is
//   declared here and React's own ref object still satisfies it.
//
//   `ChangeEvent` is a SyntheticEvent and `ReactElement` is React's node. Those
//   two stay React's, so they are TYPE PARAMETERS here — `TChangeEvent` and
//   `TElement` — and `../react/field-binding.types.ts` fills them in. Every
//   public name keeps the spelling and the meaning it had.
//
// The label, description and error bags are separate rather than folded into
// the input bag because they go on three other elements. A caller that spreads
// all four has a wired field; a caller that spreads one has exactly the one it
// asked for.
//
// A change event is not narrowed to `{ target: { value } }`. Narrowing it
// removes everything an IME-aware caller needs, which is why what a handler
// receives is the framework's own event and not a reduction of it.
// ===========================================================================
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

/**
 * The three channels a control answers on, and nothing else — enough to write
 * a cell from a change event without naming whose event it is.
 *
 * `checked` and `files` are optional because a `<textarea>` and a `<select>`
 * carry neither, and the bag this builds is spreadable onto both.
 */
export interface FieldChangeEventLike {
  readonly target: {
    readonly value: string;
    readonly checked?: boolean;
    readonly files?: FileList | null;
  };
}

/**
 * Enough of a ref for a binding to hand a node back. React's `RefObject<T>`
 * is this and nothing more, so a React binding puts its own `useRef` result
 * here and no conversion happens.
 */
export interface FieldRefObject<T> {
  current: T;
}

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
 * person typed nor one a framework can control it by, and giving it both is
 * how a checkbox ends up ignoring clicks. A `file` field carries NEITHER — it
 * is the one input that cannot be controlled at all, so the node holds what
 * was picked and the cell is written from the change event.
 *
 * `TChangeEvent` is what the handler receives. A binding fills it in with its
 * framework's event; nothing here reads more of it than
 * `FieldChangeEventLike` names.
 */
export interface FieldInputPropsOf<TChangeEvent> {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly value?: string | number;
  readonly checked?: boolean;
  onChange(event: TChangeEvent): void;
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
 *
 * It takes no type parameter. Its ref is structural and its change event is
 * already the two-member reduction above, so there is nothing left in it for
 * a framework to fill in.
 */
export interface UncontrolledInputProps {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly ref: FieldRefObject<HTMLInputElement | null>;
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

export interface FieldBindingOf<TValue, TChangeEvent, TElement> {
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
   *
   * `TElement` is the framework's element. The merge itself is the framework's
   * too — cloning an element is the one thing this layer cannot do — so what
   * is stated here is the signature and the rule, not the implementation.
   */
  decorate(element: TElement, part?: FieldPart): TElement;
  readonly inputProps: FieldInputPropsOf<TChangeEvent>;
  readonly labelProps: FieldLabelProps;
  /** Undefined when the schema declared no description. */
  readonly descriptionProps: FieldDescriptionProps | undefined;
  readonly errorProps: FieldErrorProps;
}

/**
 * A field whose value lives in the DOM node rather than in the framework's
 * state. There is no `value` and no `isDirty`: both would have to be
 * subscribed to be correct, and subscribing to them is the cost this binding
 * exists to avoid. Read either through the value hook in a component that
 * genuinely displays it, or through the form handle.
 */
export interface UncontrolledFieldBindingOf<TValue, TElement> {
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  /** Never undefined; the empty list is interned, so it is reference-stable. */
  readonly issues: readonly FormIssue[];
  readonly isTouched: boolean;
  readonly isParticipating: boolean;
  /** Put this on the input. The runtime writes the node through it. */
  readonly ref: FieldRefObject<HTMLInputElement | null>;
  /** Only read at mount; what happens to it afterwards is the binding's. */
  readonly defaultValue: string;
  onChange(event: UncontrolledChangeEvent): void;
  onBlur(): void;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  validate(): MaybeAsync<readonly FormIssue[]>;
  issuesFor(candidate: unknown): MaybeAsync<readonly FormIssue[]>;
  /** The same merge, and the same rule; see `FieldBindingOf.decorate`. */
  decorate(element: TElement, part?: FieldPart): TElement;
  /** `ref`, the default and everything the descriptor declared, in one bag. */
  readonly inputProps: UncontrolledInputProps;
  readonly labelProps: FieldLabelProps;
  /** Undefined when the schema declared no description. */
  readonly descriptionProps: FieldDescriptionProps | undefined;
  readonly errorProps: FieldErrorProps;
}
