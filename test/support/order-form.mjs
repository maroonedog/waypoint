// The order form, whose PATHS are the fixture.
//
// The two files that share this — form-hooks.test.mjs and
// hook-form-key.test.mjs — are not testing an order. They read the values
// below, but only to prove a component reached the field it addressed; what is
// under test is the relation between a STRING a component wrote and the set of
// paths a form declares. So the declaration is not scaffolding around the
// subject, it is one half of the subject, and the strings in those two files
// are meaningless except against it. "billing.postcod" is a typo only because
// `postcode` is here; "items[0].sku" is a row and "items[9].sku" is a row not
// yet inserted only because `items` is an array here.
//
// That is why this one is shared when most schemas in this suite are not. A
// second copy would not be a second fixture, it would be a second definition of
// what the words in those tests mean, and a change to either copy would leave
// two files describing one form and disagreeing about it.
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createForm } from "@maroonedog/waypoint/core";

const ORDER = z.object({
  billing: z.object({ postcode: z.string().min(3), city: z.string() }),
  shipping: z.object({ postcode: z.string().min(3), city: z.string() }),
  items: z.array(z.object({ sku: z.string() })),
});

const DEFAULTS = {
  billing: { postcode: "100-0001", city: "Chiyoda" },
  shipping: { postcode: "150-0001", city: "Shibuya" },
  items: [{ sku: "a" }, { sku: "b" }],
};

/** @param key the name the form gives itself, for the tests that need one. */
export const orderForm = (key) =>
  createForm({
    adapter: zodFormResolver(ORDER),
    defaultValues: structuredClone(DEFAULTS),
    key,
  });
