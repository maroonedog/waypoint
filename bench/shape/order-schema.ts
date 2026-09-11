// ===========================================================================
// order-schema.ts — the one schema every subject is driven against.
//
// Modelled on examples/showcase/src/schema.ts, so the benchmarked form is the
// form this repository ships rather than one shaped to suit a result.
//
// THE DEFAULTS ARE VALID, and that is load-bearing. A root `superRefine` does
// not run at all if any leaf fails, so a run that starts from an invalid root
// measures zod short-circuiting and then attributes the saving to whichever
// runtime happened to ask. Every scenario therefore starts from a root the
// schema accepts, and introduces exactly one thing.
//
// The filler fields exist so the same form can be measured at several sizes.
// They are plain strings with one bound each, because a sweep is about how a
// runtime scales with the NUMBER of fields and a sweep whose extra fields
// carried exotic rules would be measuring the rules.
// ===========================================================================
import { z } from "zod";

const POSTCODE = /^\d{3}-\d{4}$/;

const address = z.object({
  postcode: z.string().regex(POSTCODE, "postcode must look like 100-0001"),
  city: z.string().min(1, "city is required").max(40),
  street: z.string().min(1, "street is required").max(60),
  building: z.string().max(60),
});

export const fillerPathOf = (index: number): string => `extra.f${index}`;

const fillerShape = (
  count: number
): Record<string, z.ZodType<string>> => {
  const shape: Record<string, z.ZodType<string>> = {};
  for (let index = 0; index < count; index += 1) {
    shape[`f${index}`] = z.string().max(40, "at most 40 characters");
  }
  return shape;
};

export function makeOrderSchema(fillerCount: number) {
  return z
    .object({
      applicant: z.object({
        lastName: z.string().min(1, "last name is required").max(20),
        firstName: z.string().min(1, "first name is required").max(20),
        email: z.email("email is malformed"),
        phone: z.string().min(1, "phone is required").max(20),
      }),
      company: z.object({
        name: z.string().min(1, "company name is required").max(60),
        department: z.string().max(40),
        employees: z.number().min(1, "employees must be at least 1").max(1_000_000),
      }),
      billing: address,
      shipping: address,
      sameAsBilling: z.boolean(),
      payment: z.enum(["invoice", "card", "transfer"]),
      note: z.string().max(500),
      agreed: z.boolean(),
      items: z.array(
        z.object({
          sku: z.string().min(1, "sku is required").max(20),
          name: z.string().min(1, "item name is required").max(60),
          quantity: z.number().min(1, "quantity must be at least 1").max(999),
          unitPrice: z.number().min(0, "unit price must not be negative"),
        })
      ),
      extra: z.object(fillerShape(fillerCount)),
    })
    .superRefine((value, ctx) => {
      if (value.agreed !== true) {
        ctx.addIssue({
          code: "custom",
          path: ["agreed"],
          message: "the terms must be accepted",
        });
      }
      if (value.items.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "at least one line is required",
        });
      }
      // The cross-field rule. The interaction writes SHIPPING postcode and the
      // issue lands on BILLING postcode, so a runtime that only revalidates
      // the field that was typed cannot produce it. It is driven through a
      // text input rather than a checkbox so every subject receives the
      // identical instruction: one input event carrying a string.
      if (
        value.sameAsBilling === true &&
        value.shipping.postcode !== value.billing.postcode
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["billing", "postcode"],
          message: "same-as-billing is on but the postcodes differ",
        });
      }
    });
}

export const orderSchema = makeOrderSchema(0);

export type OrderValue = z.infer<typeof orderSchema>;
