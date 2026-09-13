// ===========================================================================
// schema.ts — ONE form, whatever the screen count is.
//
// A wizard is not several forms. It is one value, judged as a whole, shown a
// piece at a time — which is why there is one schema here and not three. The
// cross-field rule at the bottom exists to make that concrete: it compares a
// field on step 1 with a field on step 3, and no arrangement of three separate
// forms could express it.
// ===========================================================================
import { z } from "zod";

export const bookingSchema = z
  .object({
    traveller: z.object({
      name: z.string().min(1, "Required"),
      email: z.email("That is not an email address"),
    }),
    trip: z.object({
      from: z.string().min(3, "Three letters, e.g. LHR").max(3),
      to: z.string().min(3, "Three letters, e.g. NRT").max(3),
      nights: z.number().min(1, "At least one night").max(30),
    }),
    payment: z.object({
      holder: z.string().min(1, "The name on the card is required"),
      number: z.string().regex(/^\d{16}$/, "Sixteen digits, no spaces"),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.trip.from !== "" && value.trip.from === value.trip.to) {
      ctx.addIssue({
        code: "custom",
        path: ["trip", "to"],
        message: "The destination has to differ from the origin",
      });
    }
    // Step 1 against step 3: the name on the card should be the traveller's.
    // Three separate forms could not ask this at all.
    const traveller = value.traveller.name.trim().toLowerCase();
    const holder = value.payment.holder.trim().toLowerCase();
    if (traveller !== "" && holder !== "" && traveller !== holder) {
      ctx.addIssue({
        code: "custom",
        path: ["payment", "holder"],
        message: `This should read "${value.traveller.name}", from step 1`,
      });
    }
  });

export const EMPTY_BOOKING = {
  traveller: { name: "", email: "" },
  trip: { from: "", to: "", nights: 1 },
  payment: { holder: "", number: "" },
};
