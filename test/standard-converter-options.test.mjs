// The one object this package hands to code it does not own, and the two
// opposite ways of getting it wrong.
//
// Everything else in the family reads what a vendor produced. This is the place
// where what the resolver SAYS to a vendor is the subject — a single options
// bag passed to `~standard.jsonSchema.input`. One sibling assertion touches
// that bag: standard-schema-warnings.test.mjs reads back the two targets as the
// premise its deduplication test rests on, and leaves the rest here. The bag is
// small enough to hold in your head and both of its failure modes are invisible
// from the outside, which is why they are pinned rather than left to
// integration.
//
// Ask with too little and a vendor that only speaks draft-07 refuses
// draft-2020-12, produces nothing, and becomes indistinguishable from a vendor
// with no JSON Schema at all — the degradation warning would then fire and be
// WRONG, which is worse than silence because it sends the reader to look for a
// missing member that is present. Asking again is what keeps that vendor a
// supported vendor.
//
// Ask with too much and the damage runs the other way. A converter's options
// are vendor-specific by construction; an option invented here changes the
// document a vendor emits for a caller who never asked for it and cannot see
// where it came from. So `libraryOptions` is forwarded exactly as handed over
// and nothing is added beside `target` — the second test asserts the KEYS of
// that object, not just its contents, because an extra key is the failure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import { DOCUMENT, bothHalves } from "./support/standard-schema-doubles.mjs";
import { pathsOf } from "./support/descriptor-lookup.mjs";

test("a vendor that speaks only draft-07 is asked again rather than given up on", () => {
  const adapter = standardFormResolver(bothHalves([], { target: "draft-07" }));
  assert.deepEqual(pathsOf(adapter), [
    "owner.name",
    "owner.nickname",
    "items[*].sku",
  ]);
});

test("libraryOptions reaches the converter verbatim and is never invented", () => {
  const seen = [];
  const schema = {
    "~standard": {
      version: 1,
      vendor: "watchful",
      validate: () => ({ value: {} }),
      jsonSchema: {
        input: (options) => {
          seen.push(options);
          return DOCUMENT;
        },
      },
    },
  };

  standardFormResolver(schema);
  assert.deepEqual(Object.keys(seen[0]), ["target"], "nothing was invented");

  seen.length = 0;
  standardFormResolver(schema, { libraryOptions: { unrepresentable: "any" } });
  assert.deepEqual(seen[0], {
    target: "draft-2020-12",
    libraryOptions: { unrepresentable: "any" },
  });
});
