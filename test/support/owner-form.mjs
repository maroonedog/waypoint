// The one schema the widget tests and the status tests are both asked about.
//
// THE HAZARD THIS FIXTURE CARRIES, and it is written here because the file it
// would damage cannot see this one. auto-form.test.mjs's "layer 1 draws every
// declared field, rows included" walks a HARDCODED list of paths and asserts
// each of them was drawn. That list cannot notice a field the schema gained.
// So a field added here — to give form-status.test.mjs something more to
// block on, say — leaves that test asserting less than its name claims, and
// passing while it does. A field belongs in this schema only when the path
// list beside that assertion grows with it.
//
// WHICH IS AN ARGUMENT FOR ONE SCHEMA, NOT TWO. The hazard is not created by
// sharing; it is already there when both sets of tests sit in one file, and it
// is worse if the two files hold separate copies — then the field is added to
// one of them, the two forms quietly stop being the same form, and the reason
// the widget tests and the status tests agree about what `errorCount` should
// be is nowhere. One copy with the trap named above it is the version a reader
// can act on.
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createForm } from "@maroonedog/waypoint/core";

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
  plan: z.enum(["free", "pro"]),
  items: z.array(z.object({ sku: z.string().min(1) })),
});

export const GOOD = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  plan: "free",
  items: [{ sku: "A-1" }],
};

export const newForm = (defaultValues = GOOD) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
  });
