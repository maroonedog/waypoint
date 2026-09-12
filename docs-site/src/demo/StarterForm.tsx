// ===========================================================================
// StarterForm.tsx — the first form, shown verbatim on the start page.
//
// It is deliberately the shortest honest wiring, because it is the sample a
// reader copies. Four spreads and nothing hand-written: the input's id, its
// type, its declared bounds, the label's `htmlFor` and the `aria-describedby`
// pointing at the message all come out of the descriptor, so the sample is
// also the demonstration that they do.
//
// It used to spell `aria-invalid={field.issues.length > 0}` by hand. That line
// is gone not because accessibility got less important but because it moved:
// the binding emits it, and only when the field actually carries an issue.
// ===========================================================================
import { useState } from "react";
import {
  FormProvider,
  useCreateForm,
  useField,
  useFormStatus,
  type FormPathTo,
} from "form-react";
import { orderAdapter, orderDefaults } from "./order-form.js";

function Text({ at, label }: { at: FormPathTo<string>; label: string }) {
  const field = useField(at);
  return (
    <p>
      <label {...field.labelProps}>{label}</label>
      <input {...field.inputProps} />
      <em {...field.errorProps}>{field.issues[0]?.message}</em>
    </p>
  );
}

function SubmitButton() {
  const status = useFormStatus();
  return (
    <button type="submit" disabled={status.isSubmitting}>
      {status.errorCount > 0 ? `${status.errorCount} to fix` : "Save"}
    </button>
  );
}

export function StarterForm() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: structuredClone(orderDefaults),
  }));
  const [blocked, setBlocked] = useState<readonly string[]>([]);

  return (
    <FormProvider form={form}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const outcome = await form.submit((root) => save(root));
          setBlocked(outcome.blockedBy.map((issue) => issue.path));
        }}
      >
        <Text at="owner.name" label="Name" />
        <Text at="billing.postcode" label="Billing postcode" />
        <SubmitButton />
        {blocked.length > 0 && <p>Blocked by: {blocked.join(", ")}</p>}
      </form>
    </FormProvider>
  );
}

declare function save(root: unknown): Promise<void>;
