// ===========================================================================
// with-tanstack.tsx
//
// The schema goes in whole, as a Standard Schema validator — TanStack takes
// the same contract this repository exists to extend, so no adapter is needed.
//
// Addressing is by string, like the others, but the render-prop form carries
// the field's own state and errors with it, so nothing has to walk an errors
// object by hand. `mode="array"` on a list is load-bearing: without it every
// edit inside a row re-renders the whole list.
//
// Nothing is forced into a separate component — `form.Field` is a component,
// so it composes inside a map the way FieldArray does.
// ===========================================================================
import { useForm } from "@tanstack/react-form";
import { orderSchema, defaults, blankLine, blankShipment } from "./schema.js";
import { Panel, Row } from "./ui.js";
import ownSource from "./with-tanstack.tsx?raw";

/** Only a string is a message: a list's errors can be its rows' errors. */
const firstMessage = (errors: readonly unknown[]): string | undefined => {
  for (const held of errors) {
    if (typeof held === "string") return held;
    const message = (held as { message?: unknown } | null)?.message;
    if (typeof message === "string") return message;
  }
  return undefined;
};

export function WithTanStack() {
  const form = useForm({
    defaultValues: defaults,
    validators: { onChange: orderSchema },
  });

  return (
    <Panel title="@tanstack/react-form" source={ownSource}>
      <form.Field name="customer.name">
        {(field) => (
          <Row label="Name" error={firstMessage(field.state.meta.errors)}>
            <input
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          </Row>
        )}
      </form.Field>

      <form.Field name="shipments" mode="array">
        {(shipments) => (
          <>
            {shipments.state.value.map((_shipment, index) => (
              <div className="card" key={index}>
                <div className="card-head">
                  <strong>Shipment {index + 1}</strong>
                  <button type="button" onClick={() => shipments.removeValue(index)}>
                    Remove
                  </button>
                </div>

                <form.Field name={`shipments[${index}].address.postcode`}>
                  {(field) => (
                    <Row
                      label="Postcode"
                      error={firstMessage(field.state.meta.errors)}
                    >
                      <input
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </Row>
                  )}
                </form.Field>

                <form.Field name={`shipments[${index}].lines`} mode="array">
                  {(lines) => (
                    <div className="inner">
                      <p className="inner-head">
                        Lines <em>{firstMessage(lines.state.meta.errors) ?? ""}</em>
                      </p>
                      {lines.state.value.map((_line, at) => (
                        <div className="line" key={at}>
                          <form.Field
                            name={`shipments[${index}].lines[${at}].sku`}
                          >
                            {(field) => (
                              <Row
                                label="SKU"
                                error={firstMessage(field.state.meta.errors)}
                              >
                                <input
                                  value={field.state.value}
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                  onBlur={field.handleBlur}
                                />
                              </Row>
                            )}
                          </form.Field>
                          <form.Field
                            name={`shipments[${index}].lines[${at}].qty`}
                          >
                            {(field) => (
                              <Row
                                label="Qty"
                                error={firstMessage(field.state.meta.errors)}
                              >
                                <input
                                  value={field.state.value}
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                  onBlur={field.handleBlur}
                                />
                              </Row>
                            )}
                          </form.Field>
                          <button type="button" onClick={() => lines.removeValue(at)}>
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => lines.pushValue(blankLine())}
                      >
                        + line
                      </button>
                    </div>
                  )}
                </form.Field>
              </div>
            ))}
            <button
              type="button"
              onClick={() => shipments.pushValue(blankShipment())}
            >
              + shipment
            </button>
          </>
        )}
      </form.Field>
    </Panel>
  );
}
