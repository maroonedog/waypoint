// ===========================================================================
// tanstack-form-subject.ts — TanStack Form through its form-level validator.
//
// The shared schema goes in as a Standard Schema validator, which is TanStack
// native way of taking one: it implements the same contract this repository
// exists to extend, so handing it anything else would be measuring an adapter
// nobody would write.
//
// `useField({ form, name })`, not `<form.Field>`: the hook adds no component
// boundary, which keeps the tree the shared one. The render-prop form is the
// one the quickstart shows and it costs an extra fiber per leaf; that belongs
// in an own-tree row rather than in this one.
//
// Charged to TanStack and stated rather than hidden: mounting a FormApi
// subscribes a devtools observer unconditionally, with no option to turn it
// off. Whatever that costs is in these numbers.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm, useField } from "@tanstack/react-form";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";

type AnyForm = ReturnType<typeof useForm>;

let liveForm: AnyForm | undefined;

function Leaf({ path, label }: LeafProps): ReactElement {
  const field = useField({ form: liveForm as never, name: path as never });
  const state = field.state as {
    value: unknown;
    meta: { isValid: boolean; errors: readonly unknown[] };
  };
  const first = state.meta.errors[0] as { message?: string } | undefined;
  return h(SharedLeaf, {
    label,
    name: path,
    value: state.value === undefined ? "" : String(state.value),
    onInput: (event) =>
      (field as unknown as { handleChange(next: unknown): void }).handleChange(
        event.currentTarget.value
      ),
    onBlur: () =>
      (field as unknown as { handleBlur(): void }).handleBlur(),
    invalid: !state.meta.isValid,
    message: typeof first?.message === "string" ? first.message : undefined,
  });
}

export const tanstackFormSubject: Subject = {
  id: "tanstack-form-level",
  library: "@tanstack/react-form",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: [
    "cross-field-error-on-other-path",
    "standard-schema-native",
    "validation-mode",
  ],
  notes:
    "The shared schema as a form-level Standard Schema validator, read " +
    "through useField rather than the render-prop form.Field. Mounting a " +
    "FormApi subscribes a devtools observer that cannot be switched off.",
  policyCitation: "TanStack Form: validators.onChange",
  Leaf,

  mount(container, context) {
    const Screen = (): ReactElement => {
      liveForm = useForm({
        defaultValues: context.defaults() as never,
        validators: { onChange: context.schema as never },
      });
      return h(SharedSkeleton, { Leaf, paths: context.paths });
    };

    const root: Root = createRoot(container);
    root.render(h(Screen));

    const reach = (path: string, root_: unknown): unknown => {
      let held: unknown = root_;
      for (const segment of path.match(/[^.[\]]+/g) ?? []) {
        if (held === null || typeof held !== "object") return undefined;
        held = (held as Record<string, unknown>)[segment];
      }
      return held;
    };

    const mounted: MountedSubject = {
      setValue: (path, value) =>
        (
          liveForm as unknown as {
            setFieldValue(name: string, next: unknown): void;
          }
        ).setFieldValue(path, value),
      readValue: (path) =>
        reach(
          path,
          (liveForm as unknown as { state: { values: unknown } }).state.values
        ),
      submit: async () => {
        await (
          liveForm as unknown as { handleSubmit(): Promise<void> }
        ).handleSubmit();
      },
      unmount: () => root.unmount(),
    };
    return mounted;
  },
};
