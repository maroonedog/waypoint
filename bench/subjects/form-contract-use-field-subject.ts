// ===========================================================================
// form-contract-use-field-subject.ts — the primary row.
//
// `useField` with the shipped store, which is how the README tells somebody to
// write a form. `field.inputProps` is deliberately NOT used: it emits
// descriptor-derived required/min/max/pattern attributes, which would change
// the DOM and therefore what the comparison is measuring. The configuration
// that does use them ships separately as an own-tree subject.
//
// There is no validation-mode knob to set, because this library has none — a
// gap recorded in words in the report rather than folded into a number.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createForm, readValueAt, type FormHandle } from "form-core";
import { FormProvider, useField } from "form-react";
import type { FormAdapter } from "form-contract";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createRoot, type Root } from "react-dom/client";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import { orderDefaults } from "../shape/order-defaults.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";

function Leaf({ path, label }: LeafProps): ReactElement {
  const field = useField<string>(path);
  return h(SharedLeaf, {
    label,
    name: path,
    value: field.value === undefined ? "" : String(field.value),
    onInput: (event) => field.setValue(event.currentTarget.value),
    onBlur: () => field.markTouched(),
    invalid: field.issues.length > 0,
    message: field.issues[0]?.message,
  });
}

export const formContractUseFieldSubject: Subject = {
  id: "form-contract-use-field",
  library: "form-contract",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: [
    "validates-unmounted-fields",
    "cross-field-error-on-other-path",
    "swappable-store",
  ],
  notes:
    "No validation-mode knob exists; every settled change is judged. " +
    "inputProps is not used, so the DOM matches the shared leaf exactly.",
  Leaf,

  mount(container, schema, paths) {
    const adapter = zodFormResolver(
      schema as Parameters<typeof zodFormResolver>[0]
    ) as FormAdapter<unknown, string>;
    const form: FormHandle<unknown, string> = createForm({
      adapter,
      defaultValues: orderDefaults(),
    });
    const root: Root = createRoot(container);
    root.render(
      h(FormProvider, { form }, h(SharedSkeleton, { Leaf, paths }))
    );

    const mounted: MountedSubject = {
      setValue: (path, value) => form.field(path).setValue(value as never),
      readValue: (path) => readValueAt(form.readRoot(), path),
      unmount: () => root.unmount(),
    };
    return mounted;
  },
};
