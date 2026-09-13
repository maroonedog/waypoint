// ===========================================================================
// schema.ts — what the CLIENT can decide on its own.
//
// Every rule here is one a browser can judge with the value in front of it: a
// length, a character class, a shape. None of them can tell you whether a
// handle is already taken or whether a card will be accepted, and that is the
// line this example is about — the schema owns one side of it, and the server
// owns the other.
//
// EVERY FIELD CARRIES A TITLE, which is load-bearing rather than polish. The
// error summary shows a label where the schema declared one, so with all of
// these declared, an entry with no label is exactly an entry the descriptor
// tree does not know — which is how the page can say "no field draws this
// path" about `payment` and about nothing else.
//
// And note what is NOT here: `payment`. The server rejects on it, the form
// blocks on it, and no descriptor declares it. See fake-api.ts.
// ===========================================================================
import { z } from "zod";

export const signupSchema = z.object({
  handle: z
    .string()
    .min(3, "At least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Lower case letters, digits and underscores only")
    .meta({ title: "Handle" }),
  email: z.email("That is not an email address").meta({ title: "Email" }),
  card: z.object({
    holder: z
      .string()
      .min(1, "The name on the card is required")
      .meta({ title: "Name on the card" }),
    number: z
      .string()
      .regex(/^\d{16}$/, "Sixteen digits, no spaces")
      .meta({ title: "Card number" }),
  }),
});

export type Signup = z.infer<typeof signupSchema>;

export const EMPTY_SIGNUP: Signup = {
  handle: "",
  email: "",
  card: { holder: "", number: "" },
};
