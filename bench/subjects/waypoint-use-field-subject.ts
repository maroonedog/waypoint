// ===========================================================================
// waypoint-use-field-subject.ts — the primary row.
//
// `useField` with the shipped store, which is how the README tells somebody to
// write a form. `field.inputProps` is deliberately NOT used: it emits
// descriptor-derived required/min/max/pattern attributes, which would change
// the DOM and therefore what the comparison is measuring. The configuration
// that does use them ships separately as an own-tree subject.
//
// Use on-change validation explicitly so the comparison's policy remains
// stable if the library's default changes.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createForm, readValueAt, type FormHandle } from "@maroonedog/waypoint/core";
import { FormProvider, useField } from "@maroonedog/waypoint/react";
import type { FormAdapter } from "@maroonedog/waypoint";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createRoot, type Root } from "react-dom/client";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";

function Leaf({ path, label }: LeafProps): ReactElement {
  const field = useField(path);
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

export const waypointUseFieldSubject: Subject = {
  id: "form-contract-use-field",
  library: "@maroonedog/waypoint",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: [
    "validates-unmounted-fields",
    "cross-field-error-on-other-path",
    "swappable-store",
  ],
  notes:
    "Uses validateOn: change; every settled change is judged. " +
    "inputProps is not used, so the DOM matches the shared leaf exactly.",
  policyCitation:
    "FormOptions.validateOn: change (explicitly selected for this subject)",
  Leaf,

  mount(container, context) {
    const adapter = zodFormResolver(
      context.schema as Parameters<typeof zodFormResolver>[0]
    ) as FormAdapter<unknown, string>;
    const form: FormHandle<unknown, string> = createForm({
      adapter,
      defaultValues: context.defaults(),
      validateOn: "change",
    });
    const root: Root = createRoot(container);
    root.render(
      h(
        FormProvider,
        // The zero-path shape mounts a whole form and draws none of it, to
        // price the wiring on its own. That is also the one arrangement the
        // coverage report exists to complain about, and complaining about a
        // measurement fixture would put a diagnostic no application runs
        // inside the window being timed. The full shapes are not exempted.
        { form, partial: context.paths.length === 0 },
        h(SharedSkeleton, { Leaf, paths: context.paths })
      )
    );

    const mounted: MountedSubject = {
      setValue: (path, value) => form.field(path).setValue(value as never),
      readValue: (path) => readValueAt(form.readRoot(), path),
      submit: async () => {
        await form.submit(() => undefined);
      },
      unmount: () => root.unmount(),
    };
    return mounted;
  },
};
