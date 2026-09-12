// The argument for a vendor resolver still existing after the two-spec
// refactor, reduced to the three places it is true.
//
// `zodFormResolver` no longer reads zod. It reads `~standard.jsonSchema` and
// `~standard.validate`, the same two members every vendor is read through, and
// zod-resolver.test.mjs is the file that shows what that shared path produces.
// So the question this package now has to answer about itself is why
// resolver-zod is a package at all — and the honest form of that question is:
// delete the correction layer, and which tests go red? These, and only these.
//
// Each one is a place the generated document is LOSSY about the schema that
// generated it, and lossy where a person can see it. A `z.date()` reaches the
// converter as something JSON Schema has no type for and comes back as `{}`, so
// a date picker becomes a text box. JSON Schema's `enum` is a list of VALUES
// and zod's enum has two sides, so the rendered option reads "admin" where the
// author wrote "Admin". `z.number().int()` writes itself a pair of bounds that
// are the range of a safe integer rather than a rule anybody authored, so an
// input gains `min="-9007199254740991"`. None of the three is a crash; all
// three are UI that would change under a version bump, silently.
//
// THREE OF THESE SEVEN TESTS BOUND THE CORRECTION RATHER THAN DEMONSTRATE IT
// — the ISO date the document already got right, the declared bound that is
// not synthetic, the descriptor sitting beside a field zod could not convert. They
// are here because a correction with no boundary is not a correction, it is a
// second source of truth: every value it rewrites unasked is a place the
// document and the descriptor can disagree with nobody watching. The boundary
// is what keeps this list at three.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { byPath } from "./support/descriptor-lookup.mjs";

test("a JS Date keeps its widget, which JSON Schema cannot represent at all", () => {
  // Run here on zod 4.6.1, `jsonSchema.input()` on a schema containing
  // `z.date()` throws `Date cannot be represented in JSON Schema` and emits no
  // property whatsoever — the whole document is lost to the one field. The
  // resolver passes `{ unrepresentable: "any" }`, which gets the document back
  // with `{}` in that slot, and this restores what the `{}` used to be.
  const { fields } = zodFormResolver(
    z.object({ when: z.date(), whenever: z.date().optional() })
  );
  assert.equal(byPath(fields, "when").kind, "date");
  assert.equal(byPath(fields, "when").isRequired, true);
  assert.equal(byPath(fields, "whenever").kind, "date");
  assert.equal(byPath(fields, "whenever").isRequired, false);
});

test("an ISO date is left alone, because the document already said so", () => {
  // `z.iso.date()` survives as `format: "date"`, which resolve-widget prefers
  // over `kind` anyway. Only the JS-Date-typed field needed rescuing.
  const { fields } = zodFormResolver(z.object({ day: z.iso.date() }));
  assert.equal(byPath(fields, "day").constraints.format, "date");
});

test("an enum's choice labels come from the key, not the stored value", () => {
  // JSON Schema's `enum` is a list of VALUES. zod's enum has two sides, and
  // the one a person reads is the key — so the document alone would silently
  // turn "Admin" into "admin" in the rendered option.
  const { fields } = zodFormResolver(
    z.object({ role: z.enum({ Admin: "admin", User: "user" }) })
  );
  assert.deepEqual(byPath(fields, "role").choices, [
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ]);
});

test("an array-form enum still labels each option with its own spelling", () => {
  const { fields } = zodFormResolver(
    z.object({ role: z.enum(["admin", "user"]) })
  );
  assert.deepEqual(byPath(fields, "role").choices, [
    { value: "admin", label: "admin" },
    { value: "user", label: "user" },
  ]);
});

test("the bounds `.int()` writes for itself are not shown as bounds", () => {
  // zod spells `z.number().int()` as `minimum: -9007199254740991, maximum:
  // 9007199254740991` — the range of a JavaScript safe integer, not a rule the
  // author wrote. Carried through, an input would say min="-9007199254740991".
  const { fields } = zodFormResolver(
    z.object({ count: z.number().int(), floor: z.number().int().min(0) })
  );
  assert.deepEqual(byPath(fields, "count").constraints, {});
  assert.deepEqual(byPath(fields, "floor").constraints, { minimum: 0 });
});

test("a declared bound that is not synthetic survives", () => {
  const { fields } = zodFormResolver(
    z.object({ age: z.number().int().min(18).max(120) })
  );
  assert.deepEqual(byPath(fields, "age").constraints, {
    minimum: 18,
    maximum: 120,
  });
});

test("a field zod could not refine still arrives correctly described", () => {
  // The refinement is a correction on top of a descriptor that is already
  // right, which is the whole change: a broken zod internal now costs a date
  // widget, not every descriptor.
  const { fields } = zodFormResolver(
    z.object({ when: z.date(), name: z.string().min(2).describe("who") })
  );
  assert.deepEqual(byPath(fields, "name"), {
    path: "name",
    kind: "string",
    isRequired: true,
    description: "who",
    constraints: { minLength: 2 },
  });
});
