// ===========================================================================
// signup-form.ts — the schema the AutoForm demo is drawn from.
//
// IT DECLARES ITS OWN TITLES, and that is the whole point of the demo rather
// than a detail of it. `AutoForm` draws what the registry says, and what the
// registry says comes from the validator: `.meta({ title })` is where the
// label on the screen is written. A schema that declares none gets fields
// with no label, because the descriptor reports the absence as an absence and
// refuses to invent "Email address" out of `email` — casing, wording and
// language are the application's to decide.
//
// The demo owns a distinct registration key so its shape does not merge
// with a signup form imported by another example on the same site.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "A name is required")
    .max(40)
    .meta({ title: "Your name" }),
  email: z
    .email("That is not an email address")
    .meta({ title: "Email", description: "We only use it to confirm the account" }),
  seats: z
    .number()
    .int()
    .min(1, "At least one seat")
    .max(500, "500 seats is the limit on this plan")
    .meta({ title: "Seats" }),
  plan: z
    .enum(["free", "team", "business"])
    .meta({ title: "Plan" }),
  newsletter: z.boolean().meta({ title: "Send me the release notes" }),
});

export const signupAdapter = zodFormResolver(signupSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    autoSignup: typeof signupAdapter;
  }
}

export const EMPTY_SIGNUP = {
  name: "",
  email: "",
  seats: 1,
  plan: "free" as const,
  newsletter: false,
};
