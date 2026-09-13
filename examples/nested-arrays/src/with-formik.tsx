// ===========================================================================
// with-formik.tsx
//
// `<FieldArray>` is a render prop, so the inner list can be written inline and
// no component is forced. What is forced instead is the string: every name is
// built by concatenation, twice over for the inner list, and every error is
// fetched with `getIn(errors, theSameStringAgain)` — the path written a second
// time, with nothing checking that the two agree.
//
// `validationSchema` is deliberately NOT used. Formik's
// `prepareDataForValidation` rewrites every "" to undefined before the schema
// sees it, which is right for yup and invents `expected string, received
// undefined` on a legitimately empty zod field. So `validate` is written by
// hand — and because the shape mixes arrays with objects, it has to rebuild
// zod's issue paths into the nested shape Formik reads, deciding at each
// segment whether to make an array or an object.
// ===========================================================================
import { Formik, Form, Field, FieldArray, getIn } from "formik";
import {
  orderSchema,
  defaults,
  blankLine,
  blankShipment,
  type Order,
} from "./schema.js";
import { Panel, Row } from "./ui.js";
import ownSource from "./with-formik.tsx?raw";

/**
 * `getIn` on a CONTAINER returns its children's errors rather than a message —
 * for a list of invalid rows that is an array of objects, and rendering it is
 * a React crash. A message is whatever is actually a string.
 */
const message = (held: unknown): string | undefined =>
  typeof held === "string" ? held : undefined;

/** zod issues, rebuilt into the nested shape Formik reads. */
const validate = (values: Order) => {
  const parsed = orderSchema.safeParse(values);
  if (parsed.success) return {};
  const errors: Record<string, unknown> = {};
  for (const issue of parsed.error.issues) {
    let at: Record<string, unknown> = errors;
    issue.path.slice(0, -1).forEach((segment, index) => {
      const key = String(segment);
      // An array below an index, an object below a name. Getting this wrong
      // does not throw; it produces errors nothing ever reads.
      at[key] ??= typeof issue.path[index + 1] === "number" ? [] : {};
      at = at[key] as Record<string, unknown>;
    });
    const last = issue.path.at(-1);
    if (last !== undefined) at[String(last)] ??= issue.message;
  }
  return errors;
};

export function WithFormik() {
  return (
    <Formik
      initialValues={defaults}
      validate={validate}
      onSubmit={() => undefined}
    >
      {({ values, errors }) => (
        <Form>
          <Panel title="Formik" source={ownSource}>
            <Row label="Name" error={message(getIn(errors, "customer.name"))}>
              <Field name="customer.name" />
            </Row>

            <FieldArray name="shipments">
              {(shipments) => (
                <>
                  {values.shipments.map((shipment, index) => (
                    <div className="card" key={index}>
                      <div className="card-head">
                        <strong>Shipment {index + 1}</strong>
                        <button
                          type="button"
                          onClick={() => shipments.remove(index)}
                        >
                          Remove
                        </button>
                      </div>

                      <Row
                        label="Postcode"
                        error={message(
                          getIn(errors, `shipments.${index}.address.postcode`)
                        )}
                      >
                        <Field name={`shipments.${index}.address.postcode`} />
                      </Row>

                      <FieldArray name={`shipments.${index}.lines`}>
                        {(lines) => (
                          <div className="inner">
                            <p className="inner-head">
                              Lines{" "}
                              <em>
                                {message(
                                  getIn(errors, `shipments.${index}.lines`)
                                ) ?? ""}
                              </em>
                            </p>
                            {shipment.lines.map((_line, at) => (
                              <div className="line" key={at}>
                                <Row
                                  label="SKU"
                                  error={message(
                                    getIn(
                                      errors,
                                      `shipments.${index}.lines.${at}.sku`
                                    )
                                  )}
                                >
                                  <Field
                                    name={`shipments.${index}.lines.${at}.sku`}
                                  />
                                </Row>
                                <Row
                                  label="Qty"
                                  error={message(
                                    getIn(
                                      errors,
                                      `shipments.${index}.lines.${at}.qty`
                                    )
                                  )}
                                >
                                  <Field
                                    name={`shipments.${index}.lines.${at}.qty`}
                                  />
                                </Row>
                                <button
                                  type="button"
                                  onClick={() => lines.remove(at)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => lines.push(blankLine())}
                            >
                              + line
                            </button>
                          </div>
                        )}
                      </FieldArray>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => shipments.push(blankShipment())}
                  >
                    + shipment
                  </button>
                </>
              )}
            </FieldArray>
          </Panel>
        </Form>
      )}
    </Formik>
  );
}
