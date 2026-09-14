// ===========================================================================
// schema.ts — one order, shaped so that every rung of the widget lookup has a
// field that lands on it.
//
// `resolve-widget.ts` chooses a widget in six steps, most specific first: a
// name the caller wrote, this exact declared path, the format a vendor named,
// the fact that the field is closed, its kind, and then whatever is left. An
// example about that order is only worth reading if each step is reachable, so
// the fields below were picked for where they fall rather than for what an
// order needs:
//
//   reference       nothing more specific matches  -> fallback
//   email           format "email"                 -> byFormat
//   priority        a closed field                 -> choices
//   seats           kind "number"                  -> byKind
//   giftWrap        kind "boolean"                 -> byKind
//   notes           this declared path             -> byPath
//   lines[*].sku    nothing more specific          -> fallback, once per row
//   lines[*].qty    this declared path             -> byPath, once per row
//
// The last pair is the one worth staring at: ONE `byPath` entry spelled
// `lines[*].qty` covers every row, because the lookup matches the DECLARED
// path. A registry keyed by `lines[0].qty` would need an entry per row and
// would be wrong the moment somebody inserted one.
//
// Titles are declared here because that is the only place a label can honestly
// come from. The descriptor reports a missing title as missing rather than
// deriving "Gift wrap" from `giftWrap`, so a schema with no titles draws a
// column of unlabelled inputs — which is a true report and a bad form.
// ===========================================================================
import { z } from "zod";

export const orderSchema = z.object({
  reference: z
    .string()
    .min(3, "Three characters or more")
    .max(24)
    .meta({ title: "Reference" }),
  email: z
    .email("That is not an email address")
    .meta({ title: "Where to send the receipt" }),
  priority: z.enum(["standard", "express", "overnight"]).meta({
    title: "Priority",
  }),
  seats: z
    .number()
    .int()
    .min(1, "At least one seat")
    .max(200, "200 is the limit on this plan")
    .meta({ title: "Seats" }),
  giftWrap: z.boolean().meta({ title: "Gift wrap the whole order" }),
  notes: z
    .string()
    .max(300, "300 characters is the limit")
    .meta({ title: "Notes for the packer" }),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1, "A product code is required").meta({
          title: "Product code",
        }),
        qty: z
          .number()
          .int()
          .min(1, "At least one")
          .max(99, "99 per line")
          .meta({ title: "Quantity" }),
      })
    )
    .min(1, "An order needs a line"),
});

export const EMPTY_ORDER = {
  reference: "",
  email: "",
  priority: "standard" as const,
  seats: 1,
  giftWrap: false,
  notes: "",
  lines: [{ sku: "", qty: 1 }],
};

export const blankLine = (): { sku: string; qty: number } => ({
  sku: "",
  qty: 1,
});
