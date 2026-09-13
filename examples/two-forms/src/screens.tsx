// ===========================================================================
// screens.tsx — two forms, on one page, at the same time.
//
// Each provider carries one handle and the form names itself where it is
// created, so no `formKey` prop is written here: `createForm({ key })` and the
// prop are two places to say one thing, and saying it once is what keeps them
// from disagreeing.
//
// THE PATHS ARE WHAT DISTINGUISH THE SCREENS, not the nesting. Both screens
// draw `owner.email`, and the two are different fields with different values
// and different verdicts. Nothing is scoped, lifted or threaded to arrange
// that — the address says which form it belongs to, and there is no other
// mechanism in play.
//
// EXCEPT IN ONE PLACE, AND IT IS THE INTERESTING ONE. A summary sends a reader
// to a control by its `name`, and `name` is the path with the form taken OFF —
// so both screens here really do put an `owner.email` into the document. That
// is what `scopeProps` is for: it marks the element one screen's controls live
// inside, and the search starts there instead of at the document, where the
// other form's field is the plausible answer. It is the one collision
// qualified paths do not solve, because it happens in the DOM rather than in
// the types.
//
// WHAT DOES NOT COMPILE IS IN refusals.tsx, not in a comment here. Each of the
// five calls there carries `@ts-expect-error`, so `npm run test:types` fails
// if any of them ever starts compiling — which is the claim this example
// makes, held to rather than asserted.
// ===========================================================================
import type { ReactElement } from "react";
import {
  FormProvider,
  useCreateForm,
  useErrorSummary,
  useFormStatus,
} from "@maroonedog/waypoint/react";
import { adminAdapter, customerAdapter } from "./waypoint-forms.js";
import { EMPTY_ADMIN, EMPTY_CUSTOMER } from "./schema.js";
import { Num, Text } from "./shared-fields.js";

/** One screen's own controls, its own count, and its own jump. */
function Screen({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactElement;
}): ReactElement {
  const { errorCount } = useFormStatus();
  const summary = useErrorSummary();
  return (
    <section {...summary.scopeProps}>
      <h2>{title}</h2>
      {children}
      <div className="spread">
        <span className="hint">
          {errorCount === 0 ? "nothing is blocking" : `${errorCount} blocking`}
        </span>
        <button
          type="button"
          className="quiet"
          onClick={() => summary.focusFirst()}
          disabled={errorCount === 0}
        >
          Go to the first problem
        </button>
      </div>
    </section>
  );
}

export function CustomerScreen(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: customerAdapter,
    key: "customer",
    defaultValues: structuredClone(EMPTY_CUSTOMER),
  }));
  return (
    <FormProvider form={form}>
      <Screen title="The customer&rsquo;s own record">
        <>
          <Text at="customer:owner.name" label="Name" />
          <Text at="customer:owner.email" label="Email" />
          <Num at="customer:quotas.storageGb" label="Storage (GB)" />
          {/* This form has no seats; refusals.tsx holds the compiler to it. */}
        </>
      </Screen>
    </FormProvider>
  );
}

export function AdminScreen(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: adminAdapter,
    key: "admin",
    defaultValues: structuredClone(EMPTY_ADMIN),
  }));
  return (
    <FormProvider form={form}>
      <Screen title="An administrator&rsquo;s view of the tenant">
        <>
          <Text at="admin:tenant" label="Tenant" />
          <Text at="admin:owner.email" label="Owner email" />
          <Num at="admin:quotas.seats" label="Seats" />
          <Num at="admin:quotas.storageGb" label="Storage (GB)" />
          {/* An unqualified path is ambiguous once two are registered, and
              `tenant` is a string — both refusals are in refusals.tsx. */}
        </>
      </Screen>
    </FormProvider>
  );
}
