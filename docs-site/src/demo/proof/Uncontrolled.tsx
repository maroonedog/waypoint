import {
  FormProvider,
  useCreateForm,
  useField,
  useUncontrolledField,
} from "form-react";
import { orderAdapter, orderDefaults } from "../order-form.js";
import { useRenderCount } from "../use-render-count.js";

const BOX = "grid gap-1 text-xs font-medium text-on-surface-variant";
const INPUT = "rounded-md border border-outline-variant bg-surface p-2 text-sm";

function ControlledSku() {
  const field = useField("items[0].sku");
  const renders = useRenderCount();
  return (
    <div className={BOX}>
      <label {...field.labelProps}>useField — {renders} renders</label>
      <input className={INPUT} {...field.inputProps} />
      <em className="text-error" {...field.errorProps}>
        {field.issues[0]?.message}
      </em>
    </div>
  );
}

function UncontrolledSku() {
  const field = useUncontrolledField("items[1].sku");
  const renders = useRenderCount();
  return (
    <div className={BOX}>
      <label {...field.labelProps}>
        useUncontrolledField — {renders} renders
      </label>
      <input className={INPUT} {...field.inputProps} />
      <em className="text-error" {...field.errorProps}>
        {field.issues[0]?.message}
      </em>
    </div>
  );
}

export default function UncontrolledDemo() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: structuredClone(orderDefaults),
  }));
  return (
    <FormProvider form={form}>
      <div className="grid gap-4 text-on-surface sm:grid-cols-2">
        <ControlledSku />
        <UncontrolledSku />
      </div>
    </FormProvider>
  );
}
