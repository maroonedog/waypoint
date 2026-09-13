// ===========================================================================
// bind-field.ts — five subscriptions, composed into one binding.
//
// Five separate reads rather than one bundled snapshot. A bundled reader would
// have to build an object per call, and a getSnapshot that returns a fresh
// object is what React reports as "The result of getSnapshot should be cached"
// before it loops. Composing in the component body is harmless: it happens
// after the snapshot comparison, not during it.
//
// THE SIXTH IS `submitCount`, AND IT IS THE PRICE OF THE VISIBILITY RULE. A
// field that waits for a blur must stop waiting the moment a submit has been
// refused, and nothing else on the binding changes then — so being told costs
// one subscription per field, to a cell that moves at most once per press.
// The alternative, marking every blocking field touched on submit, would have
// cost nothing and made `isTouched` mean "the reader went here, OR the form
// was submitted", which is a different fact under the same name.
//
// Calling this opens subscriptions and nothing else. It does not register the
// field, seed a default or reset anything, so a field rendered in a portal, in
// a lazily loaded chunk, or behind a condition is not a case.
//
// It is a PLACE, not a rule. One field is one value, so `items[*].sku` has no
// answer here — it names every sku in the list, and that question is
// `useFieldValues`. The rule is still what the VALUE type is computed from,
// because a descriptor and a declared type are both keyed by the rule.
//
// `useId` is the seventh hook and the only one that is not a subscription. It
// scopes this binding's element ids, for the reason field-element-ids.ts
// gives: a path is unique within one form and a field is deliberately bindable
// twice.
//
// IT REPORTS NOTHING ABOUT COVERAGE, and that is why it is a file of its own
// rather than the inside of the public hook. Whether this binding counts as
// somebody having taken responsibility for the place is a question its CALLER
// can answer and this cannot: a hook hands the binding to a component that
// will draw it, and a widget lookup may hand back nothing at all. Both callers
// want the same subscriptions and a different answer to that question, so the
// subscriptions live here and the answer lives with each of them.
// ===========================================================================
import { useCallback, useContext, useId, type ReactElement } from "react";
import type { FormHandle } from "../core/index.js";
import type { FieldBinding, FieldPart } from "./field-binding.types.js";
import { buildInputProps } from "../dom/build-input-props.js";
import { decorateElement } from "./decorate-element.js";
import {
  descriptionPropsFor,
  errorPropsFor,
  fieldElementIds,
  labelPropsFor,
} from "../dom/field-element-ids.js";
import { useCell } from "./use-cell.js";
import { useFormForPath } from "./use-form-for-path.js";
import { visibleIssues, type IssueVisibility } from "../dom/issue-visibility.js";
import { IssueVisibilityContext } from "./issue-visibility-context.js";
import {
  wordedIssues,
  type AnyFormMessageFor,
  type FormMessageFor,
} from "../dom/form-message.js";
import { FormMessageContext } from "./form-message-context.js";

export interface FieldOptions<TCode extends string = string> {
  /**
   * When this field starts showing what the last pass found. Omit it and the
   * enclosing `<FormProvider showIssues>` decides; omit that too and it is
   * `"immediately"`, which is what this library has always done.
   *
   * It governs DISPLAY and nothing else. The pass runs as it always did, and
   * `errorCount`, `blockedBy` and the submit gate all still count what this
   * field is not yet saying.
   */
  readonly showIssues?: IssueVisibility;
  /**
   * This application's wording for an issue, over the validator's. Omit it and
   * the enclosing `<FormProvider messageFor>` decides; omit that too and the
   * validator's own text stands.
   *
   * Returning undefined keeps what the validator said, so a partial table is
   * safe: a missing translation leaves a real message rather than blanking the
   * error. The issue's `code` is the key worth matching on, and it arrives
   * from a vendor resolver only — the spec has no such member.
   */
  readonly messageFor?: FormMessageFor<TCode>;
}

export interface BoundField {
  readonly binding: FieldBinding<never>;
  /** The form the path named, for a caller that has something to tell it. */
  readonly form: FormHandle<unknown, string>;
  /** Unqualified, and already checked: the place the binding reached. */
  readonly path: string;
}

export function useFieldBinding(
  spelling: string,
  options?: FieldOptions<never>
): BoundField {
  const { form, path } = useFormForPath(spelling);
  const handle = form.field(path);
  const inherited = useContext(IssueVisibilityContext);
  const inheritedMessage = useContext(FormMessageContext);

  const held = useCell(handle.sources.value);
  const produced = useCell(handle.sources.issues);
  const isTouched = useCell(handle.sources.touched);
  const isDirty = useCell(handle.sources.dirty);
  const isParticipating = useCell(handle.sources.participating);
  const submitCount = useCell(form.submitCount);

  const issues = wordedIssues(
    visibleIssues(produced, {
      visibility: options?.showIssues ?? inherited,
      isTouched,
      isDirty,
      submitCount,
    }),
    // Widened once: this function was declared for THIS form's codes, and
    // these are this form's issues. See form-message.ts.
    (options?.messageFor ?? inheritedMessage) as
      | AnyFormMessageFor
      | undefined,
    handle.descriptor
  );

  const writeValue = useCallback(
    (next: unknown) => handle.setValue(next as never),
    [handle]
  );
  const onBlur = useCallback(() => handle.markTouched(), [handle]);

  const scope = useId();
  const ids = fieldElementIds(scope, handle.path);

  const inputProps = buildInputProps({
    path: handle.path,
    descriptor: handle.descriptor,
    value: held,
    issues,
    ids,
    writeValue,
    onBlur,
  });
  const labelProps = labelPropsFor(ids);
  const descriptionProps = descriptionPropsFor(
    ids,
    handle.descriptor?.description
  );
  const errorProps = errorPropsFor(ids);

  const bagFor = (part: FieldPart): Record<string, unknown> | undefined => {
    if (part === "label") return labelProps as unknown as Record<string, unknown>;
    if (part === "error") return errorProps as unknown as Record<string, unknown>;
    if (part === "description")
      return descriptionProps as unknown as Record<string, unknown> | undefined;
    return inputProps as unknown as Record<string, unknown>;
  };

  return {
    form,
    path: handle.path,
    binding: {
      path: handle.path,
      descriptor: handle.descriptor,
      value: held as never,
      issues,
      isTouched,
      isDirty,
      isParticipating,
      setValue: (next) => handle.setValue(next),
      markTouched: () => handle.markTouched(),
      setParticipating: (participating) =>
        handle.setParticipating(participating),
      validate: () => handle.validate(),
      issuesFor: (candidate) => handle.issuesFor(candidate),
      decorate: (element: ReactElement, part: FieldPart = "input") => {
        const bag = bagFor(part);
        return bag === undefined ? element : decorateElement(element, bag);
      },
      inputProps,
      labelProps,
      descriptionProps,
      errorProps,
    },
  };
}
