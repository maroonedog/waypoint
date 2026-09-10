import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  resolveFormFields,
  eraseFormResolver,
  UnresolvableSchemaError,
} from "form-contract";
import { zodFormResolver } from "form-contract-resolver-zod";

const resolvers = [eraseFormResolver(zodFormResolver)];
const describe = (schema) => resolveFormFields(schema, resolvers);
const byPath = (fields, path) => fields.find((f) => f.path === path);

test("reads bounds, presence and choices from a flat schema", () => {
  const fields = describe(
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
  const fields = describe(
    z.object({ owner: z.object({ name: z.string().min(1) }) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["owner.name"]);
  assert.equal(byPath(fields, "owner.name").constraints.minLength, 1);
});

test("descends an array once, through a wildcard", () => {
  const fields = describe(
    z.object({ items: z.array(z.object({ quantity: z.number().min(1) })) })
  );
  assert.deepEqual(fields.map((f) => f.path), ["items[*].quantity"]);
});

test("carries a string format through", () => {
  const fields = describe(z.object({ email: z.email() }));
  assert.equal(byPath(fields, "email").constraints.format, "email");
});

test("an exclusive bound is left out rather than shifted", () => {
  const fields = describe(z.object({ score: z.number().gt(0) }));
  assert.deepEqual(byPath(fields, "score").constraints, {});
});

test("a schema nobody claims is an error, not an empty form", () => {
  assert.throws(
    () => describe({ notASchema: true }),
    (error) =>
      error instanceof UnresolvableSchemaError &&
      error.offeredVendors.includes("zod")
  );
});

test("self-description wins over an installed resolver", () => {
  const selfDescribing = {
    "~form": {
      version: 1,
      vendor: "luq",
      fields: () => [
        { path: "own", kind: "string", isRequired: true, constraints: {} },
      ],
    },
    _zod: { def: { type: "object", shape: {} } },
  };
  assert.deepEqual(describe(selfDescribing).map((f) => f.path), ["own"]);
});
