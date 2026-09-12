// ===========================================================================
// with-form-contract.tsx
//
// A row hands down its own address. `row.path` is `shipments[0]`, and the
// component inside builds `${at}.lines` from it — so the inner list needs to
// know nothing about being inner, and the leaf needs to know nothing about
// either list.
//
// There is no separate hook for a nested array and no second component forced
// by the library. `useRows` takes a concrete path, so an inner list is reached
// by naming the row it lives in, which is what the outer row already handed
// down.
// ===========================================================================
import { FormProvider, useCreateForm, useField, useRows } from "form-react";
import { zodFormResolver } from "form-contract-resolver-zod";
import { orderSchema, defaults, blankLine, blankShipment } from "./schema.js";
import { Panel, Row } from "./ui.js";

function Text({ at, label }: { readonly at: string; readonly label: string }) {
  const field = useField<string>(at);
  return (
    <Row label={label} error={field.issues[0]?.message}>
      <input
        value={field.value ?? ""}
        onChange={(event) => field.setValue(event.target.value)}
        onBlur={field.markTouched}
      />
    </Row>
  );
}

function Lines({ at }: { readonly at: string }) {
  const lines = useRows(`${at}.lines`);
  const issues = useField(`${at}.lines`).issues;
  return (
    <div className="inner">
      <p className="inner-head">
        明細 <em>{issues[0]?.message ?? ""}</em>
      </p>
      {lines.rows.map((line) => (
        <div className="line" key={line.key}>
          <Text at={`${line.path}.sku`} label="SKU" />
          <Text at={`${line.path}.qty`} label="数量" />
          <button type="button" onClick={() => lines.remove(line.index)}>
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => lines.insert(lines.rows.length, blankLine())}
      >
        + 明細
      </button>
    </div>
  );
}

function Shipments() {
  const shipments = useRows("shipments");
  return (
    <>
      {shipments.rows.map((shipment) => (
        <div className="card" key={shipment.key}>
          <div className="card-head">
            <strong>配送先 {shipment.index + 1}</strong>
            <button
              type="button"
              onClick={() => shipments.remove(shipment.index)}
            >
              削除
            </button>
          </div>
          <Text at={`${shipment.path}.address.postcode`} label="郵便番号" />
          <Lines at={shipment.path} />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          shipments.insert(shipments.rows.length, blankShipment())
        }
      >
        + 配送先
      </button>
    </>
  );
}

export function WithFormContract() {
  const form = useCreateForm(() => ({
    adapter: zodFormResolver(orderSchema),
    defaultValues: defaults,
  }));

  return (
    <FormProvider form={form}>
      <Panel title="form-contract" note="91 行 / 「shipments」7回">
        <Text at="customer.name" label="お名前" />
        <Shipments />
      </Panel>
    </FormProvider>
  );
}
