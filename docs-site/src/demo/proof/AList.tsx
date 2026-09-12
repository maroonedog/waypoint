import { FormProvider, useCreateForm, useField, useRows, type FieldRow } from "@maroonedog/form-contract/react";
import { blankLine, orderAdapter, orderDefaults } from "../order-form.js";

const INPUT = "min-w-0 flex-1 rounded border border-outline-variant bg-surface px-2 py-1 text-sm";

function Line({ row, onRemove }: { row: FieldRow<"items">; onRemove: () => void }) {
  const sku = useField(`${row.path}.sku`);
  return (
    <div className="flex items-center gap-2 py-1">
      <code className="w-28 shrink-0 text-xs">{row.key} · {row.path}</code>
      <input {...sku.inputProps} className={INPUT} />
      <span className="w-20 shrink-0 text-xs text-error" {...sku.errorProps}>
        {sku.issues[0]?.message}
      </span>
      <button type="button" className="text-xs" onClick={onRemove}>remove</button>
    </div>
  );
}

function Lines() {
  const items = useRows("items");
  const addLine = () => items.insert(items.rows.length, blankLine());
  return (
    <div className="rounded-lg bg-surface-low p-3">
      {items.rows.map((row) => (
        <Line key={row.key} row={row} onRemove={() => items.remove(row.index)} />
      ))}
      <button type="button" className="mt-2 text-xs text-primary" onClick={addLine}>+ line</button>
    </div>
  );
}

export default function ListRows() {
  const form = useCreateForm(() => ({
    adapter: orderAdapter,
    defaultValues: structuredClone(orderDefaults),
  }));
  return <FormProvider form={form}><Lines /></FormProvider>;
}
