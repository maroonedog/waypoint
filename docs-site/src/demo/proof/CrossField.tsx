import { FormProvider, useCreateForm, useField } from "@maroonedog/form-contract/react";
import type { FormPathTo } from "@maroonedog/form-contract/react";
import { orderAdapter, orderDefaults } from "../order-form.js";

const INPUT =
  "mt-1 w-full rounded-md border border-outline-variant px-3 py-1.5 text-sm";

function Postcode({ at, label }: { at: FormPathTo<string>; label: string }) {
  const field = useField(at);
  const invalid = field.issues.length > 0;
  const edge = invalid ? "border-error" : "border-outline-variant";
  return (
    <div className={`block rounded-lg border bg-surface p-3 ${edge}`}>
      <label className="text-xs text-on-surface-variant" {...field.labelProps}>
        {label}
      </label>
      <input {...field.inputProps} className={INPUT} />
      <span className="mt-1 block h-4 text-xs text-error" {...field.errorProps}>
        {field.issues[0]?.message}
      </span>
    </div>
  );
}

export default function CrossFieldRule() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: structuredClone(orderDefaults),
  }));
  return (
    <FormProvider form={form}>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-low p-4">
        <Postcode at="billing.postcode" label="Billing postcode" />
        <Postcode at="shipping.postcode" label="Shipping postcode" />
      </div>
    </FormProvider>
  );
}
