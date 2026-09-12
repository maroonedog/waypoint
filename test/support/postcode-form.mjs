// The two-postcode form, and the rule between the two fields is the fixture.
//
// WHY THIS ONE IS SHARED WHEN THE SUPPORT PHASE REFUSED TO SHARE A SCHEMA.
// That refusal stands: a schema is the thing under test, and files that merely
// happen to describe similar data should keep their own, because a field added
// for one file's sake makes another file's test quietly assert less. This is
// the other case. `form-runtime`, `runtime-writes` and `store-substitution`
// were one file until they were split, and they are all still about the SAME
// form — the superRefine below, which puts an issue on `billing.postcode` when
// it disagrees with `shipping.postcode`, is what every one of them leans on.
// A rule that reaches across two fields is precisely what makes "only that
// component re-rendered", "only that issue cell was written" and "the other
// store behaves identically" worth asserting at all. Three copies of it would
// not be three fixtures, they would be one fixture with three chances to be
// edited in isolation, and the edit would not break anything loudly: it would
// leave one file asserting a re-render count for a rule that no longer fires.
//
// There is no document here on purpose. `runtime-writes.test.mjs` imports this
// module and must not acquire a jsdom by doing so — that separation is the cut
// those files were split on, and it would be undone by one import here. What
// the rendered files need on top lives in `postcode-slice.mjs`, which takes
// the environment and this fixture and puts them together.
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createForm } from "@maroonedog/waypoint/core";

export const SCHEMA = z
  .object({
    billing: z.object({ postcode: z.string() }),
    shipping: z.object({ postcode: z.string() }),
  })
  .superRefine((value, ctx) => {
    if (value.billing.postcode !== value.shipping.postcode) {
      ctx.addIssue({
        code: "custom",
        message: "must match shipping",
        path: ["billing", "postcode"],
      });
    }
  });

export const DEFAULTS = { billing: { postcode: "" }, shipping: { postcode: "" } };

/** The form, optionally on a store that is not the shipped one. */
export function buildForm(store) {
  return createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
    ...(store === undefined ? {} : { store }),
  });
}
