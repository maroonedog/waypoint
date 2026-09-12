// ===========================================================================
// schema.ts — one shape, shared by every implementation.
//
// Array -> object -> array. That nesting is the point: it is where the four
// libraries stop looking alike, because each one has to answer the same
// question differently — how does a field two levels inside a list say which
// row it belongs to?
//
// Everything is a string. Number coercion differs per library too, but it is
// a separate argument and mixing it in here would blur the one being made.
// ===========================================================================
import { z } from "zod";

export const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "必須です"),
  }),
  shipments: z
    .array(
      z.object({
        address: z.object({
          postcode: z.string().regex(/^\d{3}-\d{4}$/, "000-0000 の形式で"),
        }),
        lines: z
          .array(
            z.object({
              sku: z.string().min(1, "必須です"),
              qty: z.string().min(1, "必須です"),
            })
          )
          .min(1, "1行以上必要です"),
      })
    )
    .min(1, "1件以上必要です"),
});

export type Order = z.infer<typeof orderSchema>;

export const blankLine = () => ({ sku: "", qty: "1" });
export const blankShipment = () => ({
  address: { postcode: "" },
  lines: [blankLine()],
});

export const defaults: Order = {
  customer: { name: "Ada Lovelace" },
  shipments: [
    {
      address: { postcode: "100-0001" },
      lines: [
        { sku: "A-1", qty: "2" },
        { sku: "B-2", qty: "1" },
      ],
    },
    {
      address: { postcode: "150-0001" },
      lines: [{ sku: "C-3", qty: "5" }],
    },
  ],
};
