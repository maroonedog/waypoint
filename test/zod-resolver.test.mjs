import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";

const byPath = (fields, path) => fields.find((f) => f.path === path);

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
