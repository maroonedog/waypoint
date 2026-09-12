// What the two specs make of a zod schema, with nothing zod-shaped left in it.
//
// Since the refactor `zodFormResolver` takes its descriptors from
// `~standard.jsonSchema` and its verdicts from `~standard.validate` — the same
// two members every vendor is read through. So every expected value below is a
// statement about that SHARED path, with zod only supplying the input: hand a
// different vendor a document and a verdict that say the same things and none
// of these assertions would change. That is what makes this file the baseline,
// and a baseline is worth only as much as it is clean. The places where zod
// genuinely needs the shared answer corrected are in
// zod-beyond-json-schema.test.mjs, and keeping them out of here is how the
// claim "there are three of them" stays falsifiable instead of decorative.
//
// THE CONTAINERS AT THE BOTTOM STAY, and it is worth saying why they are not a
// third file. They look vendor-specific and are not: a union, a tuple and a
// record arrive as shapes none of the walk's own `type` branches match, and the
// fix for all three was in the walk, not in anything that knows about zod. They
// also cannot move. `test/types-containers/container-shapes.type-test.ts` names
// THIS file as the runtime half it is written against, shape for shape, and the
// pairing is the point of both. And the tuple test is an argument with the
// array test two hundred lines above it — one says an array is described once
// through a wildcard, the other says a fixed tuple is not one — which is a
// contradiction a reader has to be able to see resolved in one place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { byPath } from "./support/descriptor-lookup.mjs";

test("reads bounds, presence and choices from a flat schema", () => {
  const { fields } = zodFormResolver(
    z.object({
      name: z.string().min(3).max(20),
      age: z.number().min(18).max(99).multipleOf(3),
      role: z.enum(["admin", "user"]),
      bio: z.string().optional(),
    })
  );
  assert.deepEqual(fields.map((f) => f.path), ["name", "age", "role", "bio"]);
  assert.deepEqual(byPath(fields, "name"), {
    path: "name",
    kind: "string",
    isRequired: true,
    constraints: { minLength: 3, maxLength: 20 },
  });
  assert.deepEqual(byPath(fields, "age").constraints, {
    minimum: 18,
    maximum: 99,
    step: 3,
  });
  assert.deepEqual(byPath(fields, "role").choices, [
    { value: "admin", label: "admin" },
    { value: "user", label: "user" },
  ]);
  assert.equal(byPath(fields, "bio").isRequired, false);
});

test("writes a nested member as a dotted path", () => {
  const { fields } = zodFormResolver(
    z.object({ owner: z.object({ name: z.string().min(1) }) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["owner.name"]);
});

test("describes an array once, through a wildcard", () => {
  const { fields } = zodFormResolver(
    z.object({ items: z.array(z.object({ quantity: z.number().min(1) })) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["items[*].quantity"]);
});

test("carries a string format through", () => {
  const { fields } = zodFormResolver(z.object({ email: z.email() }));
  assert.equal(byPath(fields, "email").constraints.format, "email");
});

test("an exclusive bound is left out rather than shifted", () => {
  const { fields } = zodFormResolver(z.object({ score: z.number().gt(0) }));
  assert.deepEqual(byPath(fields, "score").constraints, {});
});

test("declared text arrives as the schema wrote it", () => {
  // zod 4 keeps neither `.describe()` nor `.meta()` on the definition — both
  // register against the schema object — so this is also the test that the
  // walk still has the schema in hand when it describes a leaf.
  const { fields } = zodFormResolver(
    z.object({
      email: z.string().describe("we only use it to reply"),
      nickname: z
        .string()
        .meta({ title: "Nickname", description: "what we call you" }),
    })
  );
  assert.deepEqual(byPath(fields, "email"), {
    path: "email",
    kind: "string",
    isRequired: true,
    description: "we only use it to reply",
    constraints: {},
  });
  assert.equal(byPath(fields, "nickname").label, "Nickname");
  assert.equal(byPath(fields, "nickname").description, "what we call you");
});

test("an undescribed field carries neither member, rather than undefined ones", () => {
  // `label: undefined` would read as a name that was considered and came out
  // empty. A silent schema has not considered it, and nothing here is allowed
  // to invent one from the path.
  const [field] = zodFormResolver(z.object({ name: z.string() })).fields;
  assert.equal("label" in field, false);
  assert.equal("description" in field, false);
  assert.deepEqual(Object.keys(field).sort(), [
    "constraints",
    "isRequired",
    "kind",
    "path",
  ]);
});

test("text survives the wrappers that decide presence, in either order", () => {
  // zod inherits metadata along a schema's parent chain but not across a
  // wrapper, so `.optional()` puts the two spellings on different objects.
  const { fields } = zodFormResolver(
    z.object({
      inner: z.string().describe("declared first").optional(),
      outer: z.string().optional().describe("declared last"),
      bounded: z.string().meta({ title: "Bounded" }).min(3),
    })
  );
  assert.equal(byPath(fields, "inner").description, "declared first");
  assert.equal(byPath(fields, "outer").description, "declared last");
  assert.equal(byPath(fields, "bounded").label, "Bounded");
});

test("a non-string title is declined rather than stringified", () => {
  // `meta` accepts any JSON. A renderer told to draw `[object Object]` as a
  // field's name is worse off than one told there is no name.
  const [field] = zodFormResolver(
    z.object({ name: z.string().meta({ title: { long: "Name" } }) })
  ).fields;
  assert.equal("label" in field, false);
});

test("an acceptable root produces no issues", () => {
  const adapter = zodFormResolver(z.object({ name: z.string().min(3) }));
  assert.deepEqual(adapter.validate({ name: "abc" }), []);
});

test("an issue is addressed at the path it belongs to", () => {
  const adapter = zodFormResolver(z.object({ name: z.string().min(3) }));
  const issues = adapter.validate({ name: "ab" });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "name");
  assert.equal(typeof issues[0].message, "string");
  assert.equal(issues[0].code, "too_small");
});

test("an issue inside an array names the real index, not the wildcard", () => {
  const adapter = zodFormResolver(
    z.object({ items: z.array(z.object({ quantity: z.number().min(1) })) })
  );
  const issues = adapter.validate({ items: [{ quantity: 5 }, { quantity: 0 }] });
  assert.deepEqual(issues.map((i) => i.path), ["items[1].quantity"]);
});

test("a nested issue is addressed with dots", () => {
  const adapter = zodFormResolver(
    z.object({ owner: z.object({ name: z.string().min(1) }) })
  );
  assert.deepEqual(
    adapter.validate({ owner: { name: "" } }).map((i) => i.path),
    ["owner.name"]
  );
});

test("an async refinement is judged rather than thrown over", () => {
  // The verdict now comes from `~standard.validate`, not `safeParse`. zod's
  // `safeParse` throws on an async refinement; this returns a promise, and
  // `FormAdapter.validate` is `MaybeAsync` precisely so it can.
  const adapter = zodFormResolver(
    z.object({ handle: z.string().refine(async (v) => v.length > 3, "taken") })
  );
  const outcome = adapter.validate({ handle: "ab" });
  assert.equal(typeof outcome.then, "function");
  return outcome.then((issues) => {
    assert.deepEqual(issues.map((i) => i.path), ["handle"]);
    assert.equal(issues[0].message, "taken");
  });
});

test("a synchronous schema still answers synchronously", () => {
  const outcome = zodFormResolver(z.object({ name: z.string() })).validate({
    name: "ok",
  });
  assert.equal(Array.isArray(outcome), true);
});

// --- the containers that are not an object and not a growable array ---------
//
// A union, a tuple and a record each reach `collectJsonSchemaFields` as
// something none of its `type` branches match, and each one used to come back
// as a single `kind: "unknown"` leaf with no members. The path type said
// otherwise for two of them, which is the disagreement these tests pin shut.
// The type side is `test/types-containers/container-shapes.type-test.ts`, over
// the same shapes on purpose.

test("a union's branches are flattened onto one prefix, each member optional", () => {
  const { fields } = zodFormResolver(
    z.object({
      who: z.union([
        z.object({ a: z.string() }),
        z.object({ b: z.number() }),
      ]),
    })
  );
  assert.deepEqual(fields.map((f) => f.path), ["who.a", "who.b"]);
  assert.equal(byPath(fields, "who.a").kind, "string");
  assert.equal(byPath(fields, "who.b").kind, "number");
  // Required in its own branch and absent from the other. A descriptor cannot
  // say "required only when the value took this branch", so it says optional
  // and the validator goes on enforcing the real rule.
  assert.equal(byPath(fields, "who.a").isRequired, false);
  assert.equal(byPath(fields, "who.b").isRequired, false);
});

test("a member every branch requires stays required", () => {
  const { fields } = zodFormResolver(
    z.object({
      who: z.union([
        z.object({ id: z.string(), a: z.string() }),
        z.object({ id: z.string(), b: z.number() }),
      ]),
    })
  );
  assert.equal(byPath(fields, "who.id").isRequired, true);
  assert.equal(byPath(fields, "who.a").isRequired, false);
});

test("a discriminant carries every branch's value as one choice list", () => {
  const { fields } = zodFormResolver(
    z.object({
      step: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("card"), pan: z.string() }),
        z.object({ kind: z.literal("bank"), iban: z.string() }),
      ]),
    })
  );
  assert.deepEqual(fields.map((f) => f.path), [
    "step.kind",
    "step.pan",
    "step.iban",
  ]);
  // Merged, not taken from the first branch. One branch's `const` alone would
  // render a select holding a single option, which is worse than none.
  assert.deepEqual(byPath(fields, "step.kind").choices, [
    { value: "card", label: "card" },
    { value: "bank", label: "bank" },
  ]);
  assert.equal(byPath(fields, "step.kind").isRequired, true);
  assert.equal(byPath(fields, "step.kind").kind, "string");
});

test("a union of literals is one closed field", () => {
  const { fields } = zodFormResolver(
    z.object({ size: z.union([z.literal("s"), z.literal("m")]) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["size"]);
  assert.deepEqual(byPath(fields, "size").choices, [
    { value: "s", label: "s" },
    { value: "m", label: "m" },
  ]);
});

test("a union nothing can be drawn from stays one unknown leaf", () => {
  const { fields } = zodFormResolver(
    z.object({ mixed: z.union([z.string(), z.object({ a: z.string() })]) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["mixed"]);
  assert.equal(byPath(fields, "mixed").kind, "unknown");
});

test("a fixed tuple is one leaf, not a wildcard over its positions", () => {
  const { fields } = zodFormResolver(
    z.object({ pair: z.tuple([z.string(), z.number()]) })
  );
  // `pair[*]` is what this emitted before: zod spells a fixed tuple as
  // `prefixItems` beside `items: false`, and the walk descended into the
  // `false` and described it. A descriptor is keyed by the rule and
  // `declaredPathOf` rewrites `[0]` to `[*]`, so there is no positional
  // descriptor to emit instead — `FieldPath` stops at `pair` for the same
  // reason, and the two now agree.
  assert.deepEqual(fields.map((f) => f.path), ["pair"]);
  assert.equal(byPath(fields, "pair").kind, "array");
});

test("a tuple with a rest element is a growable array again", () => {
  const { fields } = zodFormResolver(
    z.object({ rest: z.tuple([z.string()], z.number()) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["rest[*]"]);
  assert.equal(byPath(fields, "rest[*]").kind, "number");
});

test("a record is addressable and undescribed, which is a stated limit", () => {
  const { fields } = zodFormResolver(
    z.object({ bag: z.record(z.string(), z.object({ label: z.string() })) })
  );
  // One leaf at the record itself and nothing below it. A record's keys do not
  // exist until there is a value, and a descriptor is keyed by a declared
  // path, so there is no path a descriptor for `bag.<key>.label` could be
  // keyed at. The README's limits section says so.
  assert.deepEqual(fields.map((f) => f.path), ["bag"]);
  assert.equal(byPath(fields, "bag").kind, "object");
});
