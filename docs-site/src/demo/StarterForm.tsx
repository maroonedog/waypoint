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
    <label>
      <span>{label}</span>
      <input {...field.inputProps} aria-invalid={field.issues.length > 0} />
      <em>{field.issues[0]?.message}</em>
    </label>
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
