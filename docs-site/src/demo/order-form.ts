// ===========================================================================
// order-form.ts — the schema the live demo on this site is built from.
//
// Small on purpose, but it carries the three things worth watching: a leaf
// rule, a CROSS-FIELD rule that reports against the other field's path, and a
// list. Everything the pages claim can be done to it by a reader.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";

export const orderSchema = z
  .object({
    owner: z.object({ name: z.string().min(3, "3 characters or more") }),
    billing: z.object({ postcode: z.string().min(1, "Required") }),
    shipping: z.object({ postcode: z.string().min(1, "Required") }),
    items: z
      .array(z.object({ sku: z.string().min(1, "Required") }))
      .min(1, "At least one line"),
  })
  .superRefine((value, ctx) => {
    if (value.billing.postcode !== value.shipping.postcode) {
      ctx.addIssue({
        code: "custom",
        // Reported against SHIPPING, which is not the field being typed in.
        path: ["shipping", "postcode"],
        message: "Does not match billing",
      });
    }
  });

export const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/form-contract/react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}

export const orderDefaults = {
  owner: { name: "Ada Lovelace" },
  billing: { postcode: "100-0001" },
  shipping: { postcode: "100-0001" },
  items: [{ sku: "A-1" }, { sku: "B-2" }],
};

export const blankLine = (): { sku: string } => ({ sku: "" });
