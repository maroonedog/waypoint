// ===========================================================================
// form-contract-uncontrolled-subject.ts — the same runtime, not driving React.
//
// `useUncontrolledField` instead of `useField`. The value cell is subscribed
// imperatively and the listener writes the DOM node, so a keystroke that moves
// no verdict reaches React not at all — the same thing react-hook-form's
// `register` does, and the reason that row reads zero.
//
// It renders the shared leaf with no boundary of its own, so it stays
// `equal-tree` and is fiber-comparable with every other subject here. The only
// difference from the primary row is `defaultValue` + `ref` in place of
// `value`, which is exactly the difference being measured.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createForm, readValueAt, type FormHandle } from "form-core";
import { FormProvider, useUncontrolledField } from "form-react";
import type { FormAdapter } from "form-contract";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createRoot, type Root } from "react-dom/client";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";

function Leaf({ path, label }: LeafProps): ReactElement {
  const field = useUncontrolledField(path);
  return h(SharedLeaf, {
    label,
    name: path,
    defaultValue: field.defaultValue,
    inputRef: field.ref,
    onInput: (event) => field.onChange(event),
    onBlur: field.onBlur,
    invalid: field.issues.length > 0,
    message: field.issues[0]?.message,
  });
}

export const formContractUncontrolledSubject: Subject = {
  id: "form-contract-uncontrolled",
  library: "form-contract",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: [
    "validates-unmounted-fields",
    "cross-field-error-on-other-path",
    "swappable-store",
    "uncontrolled-input",
  ],
  notes:
    "The value cell is subscribed imperatively and written to the DOM node, " +
    "so a keystroke does not re-render. The stated cost: an uncontrolled " +
    "input cannot be transformed as it is typed, which is what useField is for.",
  policyCitation:
    "README: one whole-root validation pass per settled change; FormOptions " +
    "carries no validation mode",
  Leaf,

  mount(container, context) {
    const adapter = zodFormResolver(
      context.schema as Parameters<typeof zodFormResolver>[0]
    ) as FormAdapter<unknown, string>;
    const form: FormHandle<unknown, string> = createForm({
      adapter,
      defaultValues: context.defaults(),
    });
    const root: Root = createRoot(container);
    root.render(
      h(
        FormProvider,
        { form },
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
