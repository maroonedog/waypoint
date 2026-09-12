import { FormProvider, useCreateForm, useField } from "@maroonedog/waypoint/react";
import type { FormPathTo } from "@maroonedog/waypoint/react";
import { orderAdapter, orderDefaults } from "../order-form.js";
import { useRenderCount } from "../use-render-count.js";

const INPUT =
  "rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-sm";

function Row({ at, label }: { at: FormPathTo<string>; label: string }) {
  const field = useField(at);
  const renders = useRenderCount();
  return (
    <div className="mb-3 flex items-center gap-3 text-xs">
      <label className="w-24 text-on-surface-variant" {...field.labelProps}>
        {label}
      </label>
      <input {...field.inputProps} className={INPUT} />
      <span className="font-mono tabular-nums">{renders} renders</span>
      <span className="text-error" {...field.errorProps}>
        {field.issues[0]?.message}
      </span>
    </div>
  );
}

export default function AField() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: structuredClone(orderDefaults),
  }));
  return (
    <FormProvider form={form}>
      <Row at="form:owner.name" label="name" />
      <Row at="form:billing.postcode" label="billing" />
    </FormProvider>
  );
}
