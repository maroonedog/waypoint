// ===========================================================================
// react-hook-form-scoped-subject.ts — RHF, written the way RHF says to.
//
// Every knob is set where a competent user of THIS library would set it, and
// the reason is written down, because the cheapest way to win a comparison
// like this is to configure the other library badly and say nothing.
//
// `register`, not `Controller`: uncontrolled inputs are the whole architecture
// of react-hook-form, and measuring it through its controlled escape hatch
// would be measuring the configuration it exists to avoid.
//
// `useFormState({ name, exact: true })` per leaf: this is the documented way
// to subscribe one field to its own error. Without it the choice is between
// a form that shows no errors and a root that re-renders every leaf, and
// either would be a strawman.
//
// `criteriaMode: "all"`: the default keeps the first error per path while zod
// returns every one. Comparing an issue LIST against a first-error library is
// a data-model artefact, not a disagreement.
//
// `shouldUnregister: false`: the 7.x default, and the setting under which RHF
// keeps the value of a field that is not mounted — which is what lets it pass
// the unmounted-field case rather than fail a test of something it can do.
//
// The root reads NO formState key. Reading `isValid` there silently turns any
// mode into a full-schema pass per keystroke, so the thing that reads the
// verdict must never be the thing that causes it.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  FormProvider,
  useForm,
  useFormContext,
  useFormState,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { readValueAt } from "form-core";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import { orderDefaults } from "../shape/order-defaults.ts";
import { readErrorAt } from "../shape/read-error-at.ts";
import type { MountedSubject, Subject, ValidationPolicy } from "./subject.types.ts";

const DEFAULTS = orderDefaults();

/**
 * What react-hook-form has to be TOLD, because it revalidates the field that
 * changed and not the rule that changed with it. The shared schema reports on
 * billing.postcode when shipping.postcode moves, so an RHF user declares that
 * edge here. Only the deps variant supplies it; the row without it is left as
 * it is, and the two are published side by side so the price is visible rather
 * than the capability being denied.
 */
const CROSS_FIELD_DEPS: Readonly<Record<string, readonly string[]>> = {
  "shipping.postcode": ["billing.postcode"],
};

const makeLeaf = (withDeps: boolean) =>
  function Leaf({ path, label }: LeafProps): ReactElement {
  const { register } = useFormContext();
  const { errors } = useFormState({ name: path, exact: true });
  const message = readErrorAt(errors, path);
  const deps = withDeps ? CROSS_FIELD_DEPS[path] : undefined;
  const registered =
    deps === undefined ? register(path) : register(path, { deps: [...deps] });

  return h(SharedLeaf, {
    label,
    name: path,
    defaultValue: String(readValueAt(DEFAULTS, path) ?? ""),
    inputRef: registered.ref,
    onChange: registered.onChange as never,
    onBlur: registered.onBlur as never,
    invalid: message !== undefined,
    message,
  });
};

const PLAIN_LEAF = makeLeaf(false);
const DEPS_LEAF = makeLeaf(true);

interface RhfConfig {
  readonly id: string;
  readonly withDeps: boolean;
  readonly mode: "onChange" | "onSubmit";
  readonly policy: ValidationPolicy;
  readonly notes: string;
  readonly policyCitation: string;
}

const build = (config: RhfConfig): Subject => ({
  id: config.id,
  library: "react-hook-form",
  treeClass: "equal-tree",
  policy: config.policy,
  capabilities: [
    "validates-unmounted-fields",
    "cross-field-error-on-other-path",
    "validation-mode",
  ],
  notes: config.notes,
  policyCitation: config.policyCitation,
  Leaf: config.withDeps ? DEPS_LEAF : PLAIN_LEAF,

  mount(container, liveSchema, paths) {
    let methods: UseFormReturn | undefined;

    const Screen = (): ReactElement => {
      methods = useForm({
        resolver: zodResolver(liveSchema as never) as never,
        defaultValues: orderDefaults() as never,
        mode: config.mode,
        criteriaMode: "all",
        shouldUnregister: false,
      });
      return h(
        FormProvider,
        methods as never,
        h(SharedSkeleton, { Leaf: config.withDeps ? DEPS_LEAF : PLAIN_LEAF, paths })
      );
    };

    const root: Root = createRoot(container);
    root.render(h(Screen));

    const mounted: MountedSubject = {
      setValue: (path, value) =>
        methods?.setValue(path as never, value as never, {
          shouldValidate: true,
        }),
      readValue: (path) => methods?.getValues(path as never),
      submit: async () => {
        await methods?.handleSubmit(
          () => undefined,
          () => undefined
        )();
      },
      unmount: () => root.unmount(),
    };
    return mounted;
  },
});

export const reactHookFormScopedSubject = build({
    id: "react-hook-form-scoped",
    withDeps: false,
    mode: "onChange",
    policy: "on-change",
    notes:
      "register with a per-leaf useFormState({name, exact}). mode onChange, " +
      "criteriaMode all, shouldUnregister false. The root reads no formState.",
  policyCitation: "react-hook-form useForm options: mode",
});

export const reactHookFormOnSubmitSubject = build({
    id: "react-hook-form-on-submit",
    withDeps: false,
    mode: "onSubmit",
    policy: "on-submit",
    notes:
      "The shipped default. Identical to the scoped subject except mode, so " +
      "the difference between the two rows is the price of the mode alone.",
    policyCitation:
    "react-hook-form useForm options: mode defaults to onSubmit",
});

/**
 * The repair row. Identical to the scoped subject except that the cross-field
 * edge is declared, which is the supported way to make react-hook-form land an
 * error on a field the user did not type into. Published beside the row
 * without it, so "it cannot do this" is never printed where "it can, and here
 * is the price" is the truth.
 */
export const reactHookFormDepsSubject = build({
  id: "react-hook-form-deps",
  withDeps: true,
  mode: "onChange",
  policy: "on-change",
  notes:
    "The scoped subject plus register(name, { deps }) on the one field the " +
    "shared schema makes another field depend on.",
  policyCitation: "react-hook-form register options: deps",
});
