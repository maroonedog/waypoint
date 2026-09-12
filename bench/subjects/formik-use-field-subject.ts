// ===========================================================================
// formik-use-field-subject.ts — Formik, with the trap its zod users hit
// avoided rather than measured.
//
// `validate`, never `validationSchema`. Formik runs `prepareDataForValidation`
// before a validationSchema, which rewrites every empty string to undefined.
// That is right for yup and wrong for zod: a root this schema accepts comes
// back with several "expected string, received undefined" errors, and the
// benchmark would then be publishing a broken competitor rather than a slow
// one. The `validate` function here is owned by the harness, calls the shared
// instance, and returns the nested shape Formik expects — a flat dotted map
// silently shows nothing.
//
// Formik reports one message per path, which is what its error shape can hold.
// That is a capability difference, not a disagreement, so it is declared and
// the issue channel is compared on the set of paths rather than on lists.
// ===========================================================================
import { createElement as h, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FastField, Formik, useField, type FormikProps } from "formik";
import { writeValueAt } from "@maroonedog/form-contract/core";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import { issuePathToConcretePath } from "../shape/issue-path-to-concrete-path.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";
import type { MountContext } from "./mount-context.types.ts";

interface ParseOutcome {
  readonly success: boolean;
  readonly error?: {
    readonly issues: readonly {
      readonly path: readonly (string | number)[];
      readonly message: string;
    }[];
  };
}

/** The shared schema, shaped the way Formik reads errors. */
const makeValidate =
  (schema: object) =>
  (values: unknown): Record<string, unknown> => {
    const outcome = (
      schema as { safeParse(root: unknown): unknown }
    ).safeParse(values) as ParseOutcome;
    let errors: unknown = {};
    if (!outcome.success && outcome.error !== undefined) {
      const seen = new Set<string>();
      for (const issue of outcome.error.issues) {
        const path = issuePathToConcretePath(issue.path);
        if (path === "" || seen.has(path)) continue;
        seen.add(path);
        errors = writeValueAt(errors, path, issue.message);
      }
    }
    return errors as Record<string, unknown>;
  };

function Leaf({ path, label }: LeafProps): ReactElement {
  const [field, meta] = useField<string>(path);
  return h(SharedLeaf, {
    label,
    name: path,
    value: field.value === undefined ? "" : String(field.value),
    onChange: field.onChange as never,
    onBlur: field.onBlur as never,
    invalid: meta.error !== undefined,
    message: typeof meta.error === "string" ? meta.error : undefined,
  });
}

export const formikUseFieldSubject: Subject = {
  id: "formik-use-field",
  library: "formik",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: [
    "validates-unmounted-fields",
    "cross-field-error-on-other-path",
    "one-message-per-path",
    "validation-mode",
  ],
  notes:
    "validate, not validationSchema: prepareDataForValidation rewrites empty " +
    "strings to undefined, which invents errors on a valid zod root. " +
    "validateOnChange and validateOnBlur left at their defaults.",
  policyCitation: "formik: validateOnChange defaults to true",
  Leaf,

  mount(container, context) {
    return mountFormik(Leaf, container, context);
  },
};

function mountFormik(
  leaf: typeof Leaf,
  container: HTMLElement,
  context: MountContext
): MountedSubject {
    let bag: FormikProps<never> | undefined;
    const validate = makeValidate(context.schema);

    const root: Root = createRoot(container);
    root.render(
      h(
        Formik,
        {
          initialValues: context.defaults() as never,
          validate: validate as never,
          onSubmit: () => undefined,
        },
        // The render prop hands the bag over without a component or a DOM
        // node of its own, so the tree stays the shared one.
        (ready: FormikProps<never>) => {
          bag = ready;
          return h(SharedSkeleton, { Leaf: leaf, paths: context.paths });
        }
      )
    );

    const mounted: MountedSubject = {
      setValue: (path, value) => bag?.setFieldValue(path, value as never),
      readValue: (path) => {
        let held: unknown = bag?.values;
        for (const segment of path.match(/[^.[\]]+/g) ?? []) {
          if (held === null || typeof held !== "object") return undefined;
          held = (held as Record<string, unknown>)[segment];
        }
        return held;
      },
      submit: async () => {
        await bag?.submitForm();
      },
      unmount: () => root.unmount(),
    };
    return mounted;
}

// ===========================================================================
// The FastField row. Publishing only the useField row would measure Formik
// with its own performance mechanism switched off, which is the cheapest way
// to make a competitor look slow.
//
// FastField is a component boundary, so this subject renders more fibers than
// the shared tree and is declared own-tree; its wiring is measured and its
// counts are never compared against an equal-tree subject without it.
//
// Formik documented advice pairs FastField with validateOnChange: false. That
// is left ON here, so this row differs from the useField row in the render
// path alone and the two are comparable. The further saving is real and is
// not measured.
// ===========================================================================
function FastLeaf({ path, label }: LeafProps): ReactElement {
  return h(
    FastField as never,
    { name: path } as never,
    ({
      field,
      meta,
    }: {
      field: { value: unknown; onChange: unknown; onBlur: unknown };
      meta: { error?: unknown };
    }) =>
      h(SharedLeaf, {
        label,
        name: path,
        value: field.value === undefined ? "" : String(field.value),
        onChange: field.onChange as never,
        onBlur: field.onBlur as never,
        invalid: meta.error !== undefined,
        message: typeof meta.error === "string" ? meta.error : undefined,
      })
  );
}

export const formikFastFieldSubject: Subject = {
  ...formikUseFieldSubject,
  id: "formik-fast-field",
  treeClass: "own-tree",
  notes:
    "FastField, which skips a re-render unless its own value, error or " +
    "touched flag moved. validateOnChange left on, so this row differs from " +
    "the useField row in the render path alone; the documented pairing with " +
    "validateOnChange: false is a further saving not measured here.",
  Leaf: FastLeaf,
  mount(container, context) {
    return mountFormik(FastLeaf, container, context);
  },
};
