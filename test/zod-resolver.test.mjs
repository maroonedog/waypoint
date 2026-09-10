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
