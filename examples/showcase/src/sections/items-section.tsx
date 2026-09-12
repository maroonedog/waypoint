import type { ReactElement } from "react";
import { Field, FieldRows, useFieldIssues } from "@maroonedog/form-contract/react";
import { MdTextField } from "../md/text-field.js";
import { MdNumberField } from "../md/number-field.js";
import { MdButton } from "../md/button.js";
import { SectionCard } from "../md/section-card.js";

/**
 * The array-level issues live at `items`, which has no descriptor — a vendor
 * describes fields and a container is not one. Reading them is one hook.
 */
function OrderTotalNotice(): ReactElement | null {
  const issues = useFieldIssues("items");
  if (issues.length === 0) return null;
  return (
    <p className="mb-4 flex items-start gap-2 rounded-sm bg-error-container px-4 py-3 text-sm text-on-error-container sm:col-span-2">
      <span aria-hidden className="material-symbols-rounded text-[18px]">
        error
      </span>
      {issues.map((issue) => issue.message).join(" / ")}
    </p>
  );
}

export function ItemsSection(): ReactElement {
  return (
    <FieldRows path="items">
      {({ rows, insert, remove }) => (
        <SectionCard
          icon="list_alt"
          title="ご注文明細"
          caption={`${rows.length} 行`}
          actions={
            <MdButton
              tone="tonal"
              icon="add"
              onClick={() =>
                insert(rows.length, {
                  sku: "",
                  name: "",
                  quantity: 1,
                  unitPrice: 0,
                })
              }
            >
              行を追加
            </MdButton>
          }
        >
          <OrderTotalNotice />
          {rows.map((row) => (
            <div key={row.key} className="mb-2 grid gap-x-4 gap-y-1 rounded-md bg-surface-container p-4 sm:col-span-2 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <Field path={`${row.path}.sku`}>
                    {(field) => (
                      <MdTextField field={field} label="商品コード" />
                    )}
                  </Field>
                </div>
                <div className="sm:col-span-4">
                  <Field path={`${row.path}.name`}>
                    {(field) => <MdTextField field={field} label="品名" />}
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field path={`${row.path}.quantity`}>
                    {(field) => <MdNumberField field={field} label="数量" />}
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field path={`${row.path}.unitPrice`}>
                    {(field) => (
                      <MdNumberField field={field} label="単価" suffix="円" />
                    )}
                  </Field>
                </div>
                <div className="flex items-center justify-end sm:col-span-1">
                  <button
                    type="button"
                    aria-label="この行を削除"
                    onClick={() => remove(row.index)}
                    disabled={rows.length === 1}
                    className="state-layer relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-on-surface-variant disabled:opacity-38"
                  >
                    <span
                      aria-hidden
                      className="material-symbols-rounded text-[20px]"
                    >
                      delete
                    </span>
                  </button>
                </div>
            </div>
          ))}
        </SectionCard>
      )}
    </FieldRows>
  );
}
