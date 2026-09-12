// ===========================================================================
// with-react-hook-form.tsx
//
// Written the way the documentation says. Two things it forces that the others
// do not:
//
// 1. A nested field array needs its OWN component. `useFieldArray` is a hook,
//    so it cannot be called in a loop, and the inner list's `name` depends on
//    the outer index — which is only known inside the map. The docs say this
//    outright ("useFieldArray ... nested field array, you will have to use a
//    separate component"). `<Lines>` exists because of the library, not
//    because the screen wanted it.
//
// 2. Every name is built by string concatenation, and `errors` is read by
//    walking the nested object by hand — `errors.shipments?.[i]?.lines?.[j]`.
//    A misspelt segment is not a type error; it is `undefined`, which reads as
//    "no error here" and shows nothing.
// ===========================================================================
import { useFieldArray, useForm, useFormContext, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderSchema, defaults, blankLine, blankShipment, type Order } from "./schema.js";
import { Panel, Row } from "./ui.js";

function Lines({ at }: { readonly at: number }) {
  const { control, register, formState } = useFormContext<Order>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `shipments.${at}.lines`,
  });
  const listError = formState.errors.shipments?.[at]?.lines;
  return (
    <div className="inner">
      <p className="inner-head">
        明細 <em>{listError?.message ?? listError?.root?.message ?? ""}</em>
      </p>
      {fields.map((line, index) => (
        <div className="line" key={line.id}>
          <Row
            label="SKU"
            error={formState.errors.shipments?.[at]?.lines?.[index]?.sku?.message}
          >
            <input {...register(`shipments.${at}.lines.${index}.sku`)} />
          </Row>
          <Row
            label="数量"
            error={formState.errors.shipments?.[at]?.lines?.[index]?.qty?.message}
          >
            <input {...register(`shipments.${at}.lines.${index}.qty`)} />
          </Row>
          <button type="button" onClick={() => remove(index)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append(blankLine())}>
        + 明細
      </button>
    </div>
  );
}

function Shipments() {
  const { control, register, formState } = useFormContext<Order>();
  const { fields, append, remove } = useFieldArray({ control, name: "shipments" });
  return (
    <>
      {fields.map((shipment, index) => (
        <div className="card" key={shipment.id}>
          <div className="card-head">
            <strong>配送先 {index + 1}</strong>
            <button type="button" onClick={() => remove(index)}>
              削除
            </button>
          </div>
          <Row
            label="郵便番号"
            error={
              formState.errors.shipments?.[index]?.address?.postcode?.message
            }
          >
            <input {...register(`shipments.${index}.address.postcode`)} />
          </Row>
          {/* A component the library requires, not one the screen wanted. */}
          <Lines at={index} />
        </div>
      ))}
      <button type="button" onClick={() => append(blankShipment())}>
        + 配送先
      </button>
    </>
  );
}

export function WithReactHookForm() {
  const methods = useForm<Order>({
    resolver: zodResolver(orderSchema),
    defaultValues: defaults,
    mode: "onChange",
    criteriaMode: "all",
  });

  return (
    <FormProvider {...methods}>
      <Panel title="react-hook-form" note="94 行 / 「shipments」10回">
        <Row label="お名前" error={methods.formState.errors.customer?.name?.message}>
          <input {...methods.register("customer.name")} />
        </Row>
        <Shipments />
      </Panel>
    </FormProvider>
  );
}
