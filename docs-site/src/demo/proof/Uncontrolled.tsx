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
    <label className={BOX}>
      useField — {renders} renders
      <input
        className={INPUT}
        value={field.value ?? ""}
        onChange={(event) => field.setValue(event.target.value)}
      />
      <em className="text-error">{field.issues[0]?.message}</em>
    </label>
  );
}

function UncontrolledSku() {
  const field = useUncontrolledField("items[1].sku");
  const renders = useRenderCount();
  return (
    <label className={BOX}>
      useUncontrolledField — {renders} renders
      <input
        className={INPUT}
        ref={field.ref}
        defaultValue={field.defaultValue}
        onChange={field.onChange}
      />
      <em className="text-error">{field.issues[0]?.message}</em>
    </label>
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
