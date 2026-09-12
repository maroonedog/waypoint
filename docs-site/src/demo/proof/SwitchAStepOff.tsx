import { useState } from "react";
import {
  FormProvider,
  useCreateForm,
  useField,
  useParticipation,
} from "@maroonedog/waypoint/react";
import { orderAdapter, orderDefaults } from "../order-form.js";

const INPUT = "rounded-md border border-outline-variant bg-surface px-2 py-1";
const BUTTON = "rounded-md bg-primary px-3 py-1 text-sm text-on-primary";

function ShippingPostcode() {
  const field = useField("shipping.postcode");
  return (
    <label className="flex items-center gap-3 text-sm">
      shipping postcode
      <input {...field.inputProps} className={INPUT} />
      <span className="text-error">{field.issues[0]?.message}</span>
    </label>
  );
}

export default function ShippingStep() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: {
      ...structuredClone(orderDefaults),
      shipping: { postcode: "530-0002" },
    },
  }));
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [sent, setSent] = useState("");
  useParticipation(form, "shipping", !sameAsBilling);

  const send = async () => {
    const outcome = await form.submit((root) => setSent(JSON.stringify(root)));
    const blocked = outcome.blockedBy.map((issue) => issue.path);
    if (blocked.length > 0) setSent(`blocked by ${blocked.join(", ")}`);
  };

  return (
    <FormProvider form={form}>
      <div className="space-y-3 rounded-xl border border-outline-variant p-4">
        <ShippingPostcode />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(event) => setSameAsBilling(event.target.checked)}
          />
          same as billing
        </label>
        <button type="button" className={BUTTON} onClick={send}>
          submit
        </button>
        <p className="break-all font-mono text-xs">{sent}</p>
      </div>
    </FormProvider>
  );
}
