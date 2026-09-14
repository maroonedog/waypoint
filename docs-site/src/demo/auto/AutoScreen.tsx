// ===========================================================================
// AutoScreen.tsx — the whole application, for a form nobody drew.
//
// There is no component here for any field of the signup form, and there is
// no path written anywhere in this file. `<AutoForm />` walks the registered
// descriptors in declaration order and renders each one through the widget
// table; add a field to the schema and it appears, labelled, validated and
// blocking the submit, with nothing here edited.
//
// What that costs is stated where it is spent: AutoForm mints its paths at run
// time from the descriptor tree, so this is the one layer of the library where
// a path is not checked by the compiler. It is the layer that exists to draw a
// form nobody wrote component code for, and checking a path against a registry
// only means anything where somebody typed one.
// ===========================================================================
import { useEffect, useState, type ReactElement } from "react";
import {
  AutoForm,
  FormProvider,
  useCreateForm,
  useForm,
  useFormStatus,
} from "@maroonedog/waypoint/react";
import { signupAdapter, EMPTY_SIGNUP } from "./signup-form.js";
import { SIGNUP_WIDGETS } from "./signup-widgets.js";

function SubmitBar({
  onSubmitted,
}: {
  readonly onSubmitted: (root: unknown) => void;
}): ReactElement {
  const form = useForm();
  const { errorCount, isSubmitting } = useFormStatus();
  return (
    <div className="auto-bar">
      <p className="auto-count">
        {errorCount === 0 ? "Ready to send" : `${errorCount} field(s) to fix`}
      </p>
      <button
        type="button"
        className="auto-submit"
        disabled={isSubmitting}
        onClick={() => {
          void form.submit((root) => onSubmitted(root));
        }}
      >
        Create the account
      </button>
    </div>
  );
}

export default function AutoScreen(): ReactElement {
  const [submitted, setSubmitted] = useState<unknown>(undefined);
  const form = useCreateForm(() => ({
    adapter: signupAdapter,
    key: "signup",
    defaultValues: structuredClone(EMPTY_SIGNUP),
  }));

  // ONE PASS AT MOUNT, and it is here because the bar below would otherwise
  // open on "Ready to send" over two empty required fields. `errorCount` is
  // the verdict of the LAST pass, and on a form nobody has typed into there
  // has not been one — the number is 0 because nothing has been judged, not
  // because nothing is wrong. An application that wants a count at rest asks
  // for it; this one does.
  useEffect(() => {
    void form.validate();
  }, [form]);

  return (
    <div className="auto-screen">
      <FormProvider form={form} widgets={SIGNUP_WIDGETS} showIssues="touched">
        <AutoForm />
        <SubmitBar onSubmitted={setSubmitted} />
      </FormProvider>
      {submitted === undefined ? null : (
        <pre className="auto-sent">{JSON.stringify(submitted, null, 2)}</pre>
      )}
    </div>
  );
}
