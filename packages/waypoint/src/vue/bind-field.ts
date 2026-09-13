// ===========================================================================
// bind-field.ts — six subscriptions, composed into one binding.
//
// The same six the React binding opens, for the same reasons: five field
// channels read separately rather than as one bundled snapshot, plus
// `submitCount`, which is what lets a field waiting for a blur stop waiting
// the moment a submit has been refused.
//
// WHAT IS SHAPED DIFFERENTLY, AND IT IS ONE THING. React re-runs the hook and
// rebuilds the binding on every render, so every member is simply a value.
// Vue's `setup()` runs once, so the binding handed back here is an object of
// GETTERS over computeds. A caller writes `field.value`, `field.issues`,
// `v-bind="field.inputProps"` and reads a current answer every time, and each
// read tracks only the cells it actually touched — which is why a component
// that draws a field's issues and not its value does not re-render when the
// value moves.
//
// It is deliberately not a `reactive()` wrapper and not a bundle of refs. A
// `reactive()` proxy would make `field.inputProps.onInput` a proxied function
// and put a proxy between every read and the cell; a bundle of refs would make
// every call site write `.value` four times per field. Getters over computeds
// cost neither and read the same in a template and in a render function.
//
// CALLING THIS OPENS SUBSCRIPTIONS AND NOTHING ELSE. It does not register the
// field, seed a default or reset anything.
//
// IT REPORTS NOTHING ABOUT COVERAGE, and that is why it is a file of its own
// rather than the inside of the public composable. Whether this binding counts
// as somebody having taken responsibility for the place is a question its
// CALLER can answer and this cannot: `useField` hands the binding to whoever
// asked, and `<Field>`'s widget lookup may hand back nothing at all.
// ===========================================================================
import {
  computed,
  inject,
  toValue,
  useId,
  type ComputedRef,
  type MaybeRefOrGetter,
  type VNode,
} from "vue";
import type { FormHandle } from "../core/index.js";
import { buildInputProps } from "../dom/build-input-props.js";
import {
  descriptionPropsFor,
  errorPropsFor,
  fieldElementIds,
  labelPropsFor,
} from "../dom/field-element-ids.js";
import type { FieldPart } from "../dom/field-binding.types.js";
import {
  DEFAULT_ISSUE_VISIBILITY,
  visibleIssues,
  type IssueVisibility,
} from "../dom/issue-visibility.js";
import {
  wordedIssues,
  type AnyFormMessageFor,
  type FormMessageFor,
} from "../dom/form-message.js";
import type { FieldBinding } from "./field-binding.types.js";
import {
  FormMessageInjection,
  IssueVisibilityInjection,
} from "./injection-keys.js";
import { decorateVNode } from "./decorate-vnode.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import { vueInputProps } from "./vue-input-props.js";

export interface FieldOptions<TCode extends string = string> {
  /**
   * When this field starts showing what the last pass found. Omit it and the
   * enclosing `<FormProvider show-issues>` decides; omit that too and it is
   * `"immediately"`, which is what this library has always done.
   *
   * A ref or a getter is accepted for the reason use-form-for-path.ts gives
   * about the path: `setup()` runs once, so a plain value read here is the
   * value this field keeps.
   *
   * It governs DISPLAY and nothing else. The pass runs as it always did, and
   * `errorCount`, `blockedBy` and the submit gate all still count what this
   * field is not yet saying.
   */
  readonly showIssues?: MaybeRefOrGetter<IssueVisibility>;
  /**
   * This application's wording for an issue, over the validator's. Omit it and
   * the enclosing `<FormProvider :message-for>` decides; omit that too and the
   * validator's own text stands.
   *
   * Returning undefined keeps what the validator said, so a partial table is
   * safe. The issue's `code` is the key worth matching on, and it arrives from
   * a vendor resolver only — the spec has no such member.
   */
  readonly messageFor?: FormMessageFor<TCode>;
}

export interface BoundField {
  readonly binding: FieldBinding<never>;
  /** The form the path named, for a caller that has something to tell it. */
  readonly form: FormHandle<unknown, string>;
  /** Unqualified, and already checked: the place the binding reached. */
  readonly path: ComputedRef<string>;
}

export function useFieldBinding(
  spelling: MaybeRefOrGetter<string>,
  options?: FieldOptions<never>
): BoundField {
  const { form, path } = useFormForPath(spelling);
  const handle = computed(() => form.field(path.value));
  const inheritedVisibility = inject(
    IssueVisibilityInjection,
    () => DEFAULT_ISSUE_VISIBILITY
  );
  const inheritedMessage = inject(
    FormMessageInjection,
    () => undefined as AnyFormMessageFor | undefined
  );

  const held = useCell(() => handle.value.sources.value);
  const produced = useCell(() => handle.value.sources.issues);
  const isTouched = useCell(() => handle.value.sources.touched);
  const isDirty = useCell(() => handle.value.sources.dirty);
  const isParticipating = useCell(() => handle.value.sources.participating);
  const submitCount = useCell(() => form.submitCount);

  const issues = computed(() =>
    wordedIssues(
      visibleIssues(produced.value, {
        visibility:
          options?.showIssues === undefined
            ? inheritedVisibility()
            : toValue(options.showIssues),
        isTouched: isTouched.value,
        isDirty: isDirty.value,
        submitCount: submitCount.value,
      }),
      // Widened once: this table was declared for THIS form's codes, and these
      // are this form's issues. See form-message.ts.
      (options?.messageFor ?? inheritedMessage()) as
        | AnyFormMessageFor
        | undefined,
      handle.value.descriptor
    )
  );

  // The id scope, for the reason field-element-ids.ts gives: a path is unique
  // within one form and a field is deliberately bindable twice. Vue's own
  // `useId` is what supplies one. Measured on 3.5.42: two calls in one
  // component yielded `v-0` and `v-1`, a server render and the client
  // hydration of it produced the same two with no hydration warning, and
  // `"#" + id` is a selector `querySelectorAll` accepts unescaped, which is
  // what anything looking a control up by its id has to hand it.
  const scope = useId();
  const ids = computed(() => fieldElementIds(scope, handle.value.path));

  const inputProps = computed(() =>
    vueInputProps(
      buildInputProps({
        path: handle.value.path,
        descriptor: handle.value.descriptor,
        value: held.value,
        issues: issues.value,
        ids: ids.value,
        writeValue: (next) => handle.value.setValue(next as never),
        onBlur: () => handle.value.markTouched(),
      })
    )
  );
  const labelProps = computed(() => labelPropsFor(ids.value));
  const descriptionProps = computed(() =>
    descriptionPropsFor(ids.value, handle.value.descriptor?.description)
  );
  const errorProps = computed(() => errorPropsFor(ids.value));

  const bagFor = (part: FieldPart): Record<string, unknown> | undefined => {
    if (part === "label") {
      return labelProps.value as unknown as Record<string, unknown>;
    }
    if (part === "error") {
      return errorProps.value as unknown as Record<string, unknown>;
    }
    if (part === "description") {
      return descriptionProps.value as unknown as
        | Record<string, unknown>
        | undefined;
    }
    return inputProps.value as unknown as Record<string, unknown>;
  };

  return {
    form,
    path,
    binding: {
      get path() {
        return handle.value.path;
      },
      get descriptor() {
        return handle.value.descriptor;
      },
      get value() {
        return held.value as never;
      },
      get issues() {
        return issues.value;
      },
      get isTouched() {
        return isTouched.value;
      },
      get isDirty() {
        return isDirty.value;
      },
      get isParticipating() {
        return isParticipating.value;
      },
      setValue: (next) => handle.value.setValue(next),
      markTouched: () => handle.value.markTouched(),
      setParticipating: (participating) =>
        handle.value.setParticipating(participating),
      validate: () => handle.value.validate(),
      issuesFor: (candidate) => handle.value.issuesFor(candidate),
      decorate: (element: VNode, part: FieldPart = "input") => {
        const bag = bagFor(part);
        return bag === undefined ? element : decorateVNode(element, bag);
      },
      get inputProps() {
        return inputProps.value;
      },
      get labelProps() {
        return labelProps.value;
      },
      get descriptionProps() {
        return descriptionProps.value;
      },
      get errorProps() {
        return errorProps.value;
      },
    },
  };
}
