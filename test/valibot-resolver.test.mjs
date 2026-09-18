import { test } from "node:test";
import assert from "node:assert/strict";
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { valibotFormResolver } from "@maroonedog/waypoint/resolver-valibot";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import { createForm } from "@maroonedog/waypoint/core";

test("partial execution skips unrelated rules and preserves their errors until full submit", async () => {
  const counts = { a: 0, b: 0 };
  const schema = v.object({
    a: v.pipe(v.string(), v.check(value => { counts.a++; return value.length > 0; })),
    b: v.pipe(v.string(), v.check(value => { counts.b++; return value.length > 0; })),
  });
  const fields = ["a", "b"].map(path => ({ path, kind: "string", isRequired: true, constraints: {} }));
  const form = createForm({ adapter: valibotFormResolver(schema, { partial: true, fields }), defaultValues: { a: "", b: "" } });
  await form.validate();
  assert.equal(form.errorCount.read(), 2);
  counts.a = counts.b = 0;
  form.field("a").setValue("fixed");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(counts, { a: 1, b: 0 });
  assert.deepEqual(form.blockedBy.read().map(issue => issue.path), ["b"]);
  await form.submit(() => assert.fail("invalid sibling must block submit"));
  assert.deepEqual(counts, { a: 2, b: 1 });
});

test("partial async object validation retains native codes and skips unrelated async checks", async () => {
  let otherCalls = 0;
  const schema = v.objectAsync({
    email: v.pipeAsync(v.string(), v.checkAsync(async value => value.includes("@"), "Invalid email")),
    other: v.pipeAsync(v.string(), v.checkAsync(async () => { otherCalls++; return true; })),
  });
  const fields = ["email", "other"].map(path => ({ path, kind: "string", isRequired: true, constraints: {} }));
  const adapter = valibotFormResolver(schema, { partial: true, fields });
  const result = await adapter.validatePartial({ email: "bad", other: "ok" }, ["email"]);
  assert.deepEqual(result.paths, ["email"]);
  assert.deepEqual(result.issues, [{ path: "email", code: "check", message: "Invalid email" }]);
  assert.equal(otherCalls, 0);
});

test("partial nested objects and arrays preserve container checks", () => {
  let otherCalls = 0;
  const schema = v.object({
    account: v.pipe(v.object({ password: v.string(), confirmation: v.string() }),
      v.forward(v.check(value => value.password === value.confirmation, "Mismatch"), ["confirmation"])),
    rows: v.array(v.object({ name: v.pipe(v.string(), v.minLength(1)) })),
    other: v.pipe(v.string(), v.check(() => { otherCalls++; return true; })),
  });
  const adapter = valibotFormResolver(schema, { partial: true });
  const root = { account: { password: "a", confirmation: "b" }, rows: [{ name: "ok" }, { name: "" }], other: "" };
  const result = adapter.validatePartial(root, ["account.password", "rows[0].name"]);
  assert.deepEqual(result.paths, ["account", "rows"]);
  assert.deepEqual(result.issues.map(issue => issue.path), ["account.confirmation", "rows[1].name"]);
  assert.equal(otherCalls, 0);
});

test("root pipes, fallback and wrapped message schemas retain whole-form semantics", () => {
  const base = v.object({ a: v.string(), b: v.string() });
  const piped = valibotFormResolver(v.pipe(base,
    v.forward(v.check(value => value.a === value.b, "Mismatch"), ["b"])), { partial: true });
  const result = piped.validatePartial({ a: "a", b: "b" }, ["a"]);
  assert.deepEqual(result.paths, [""]);
  assert.equal(result.issues[0].path, "b");
  for (const schema of [v.fallback(base, { a: "", b: "" }), v.message(base, "Wrapped")]) {
    const adapter = valibotFormResolver(schema, { partial: true });
    const root = { a: "a", b: 1 };
    const outcome = adapter.validatePartial(root, ["a"]);
    assert.deepEqual(outcome.paths, [""]);
    assert.deepEqual(outcome.issues, adapter.validate(root));
  }
});

test("strict, loose and rest object selection preserves unknown-key behavior", () => {
  for (const schema of [v.strictObject({ a: v.string(), b: v.string() }),
    v.looseObject({ a: v.string(), b: v.string() }),
    v.objectWithRest({ a: v.string(), b: v.string() }, v.number())]) {
    const adapter = valibotFormResolver(schema, { partial: true });
    assert.deepEqual(adapter.validatePartial({ a: "a", b: "b" }, ["a"]), { paths: ["a"], issues: [] });
    const extra = { a: "a", b: "b", extra: false };
    const result = adapter.validatePartial(extra, ["a"]);
    assert.deepEqual(result.paths, [""]);
    assert.deepEqual(result.issues, adapter.validate(extra));
  }
});

test("partial execution collects all pipe issues and leaves transformed values in input form", () => {
  v.setGlobalConfig({ abortEarly: true, abortPipeEarly: true });
  try {
    const schema = v.object({ a: v.pipe(v.string(), v.minLength(3), v.email()), b: v.pipe(v.string(), v.transform(Number)) });
    const adapter = valibotFormResolver(schema, { partial: true });
    const root = { a: "x", b: "42" };
    const result = adapter.validatePartial(root, ["a", "b"]);
    assert.deepEqual(result.issues.map(issue => issue.code), ["min_length", "email"]);
    assert.equal(root.b, "42");
    assert.equal(valibotFormResolver(schema).validatePartial, undefined);
    assert.deepEqual(adapter.validatePartial(null, ["a"]).paths, [""]);
    assert.deepEqual(adapter.validatePartial(root, ["unknown"]).paths, [""]);
  } finally { v.deleteGlobalConfig(); }
});

test("Valibot descriptors match the standard resolver, with labels, bounds, and array paths", () => {
  const schema = v.object({
    email: v.pipe(v.string(), v.email(), v.title("Email"), v.description("Your address")),
    age: v.optional(v.pipe(v.number(), v.minValue(18))),
    items: v.array(v.object({ sku: v.pipe(v.string(), v.minLength(2)) })),
    role: v.picklist(["reader", "editor"]),
  });
  const adapter = valibotFormResolver(schema);
  assert.deepEqual(adapter.fields, standardFormResolver(toStandardJsonSchema(schema)).fields);
  const email = adapter.fields.find((field) => field.path === "email");
  assert.equal(email.label, "Email");
  assert.equal(email.description, "Your address");
  assert.equal(email.constraints.format, "email");
  assert.equal(adapter.fields.find((field) => field.path === "items[*].sku").constraints.minLength, 2);
  assert.equal(adapter.fields.find((field) => field.path === "age").isRequired, false);
});

test("native issue types and nested array indices survive", () => {
  const adapter = valibotFormResolver(v.object({ items: v.array(v.object({
    email: v.pipe(v.string(), v.email("Bad email")),
  })) }));
  assert.deepEqual(adapter.validate({ items: [{ email: "ok@example.com" }, { email: "bad" }] }), [
    { path: "items[1].email", code: "email", message: "Bad email" },
  ]);
  assert.deepEqual(adapter.validate({ items: [] }), []);
  assert.equal(adapter.validate(null)[0].path, "");
});

test("all fields and failing pipe actions are reported despite global abort settings", () => {
  v.setGlobalConfig({ abortEarly: true, abortPipeEarly: true });
  try {
    const adapter = valibotFormResolver(v.object({
      name: v.pipe(v.string(), v.minLength(4), v.regex(/^A/)),
      email: v.pipe(v.string(), v.email()),
    }));
    assert.deepEqual(adapter.validate({ name: "b", email: "bad" }).map((issue) => issue.code),
      ["min_length", "regex", "email"]);
  } finally { v.deleteGlobalConfig(); }
});

test("async schemas require explicit fields and preserve asynchronous issue types", async () => {
  const schema = v.objectAsync({ email: v.pipeAsync(v.string(), v.checkAsync(async () => false, "Taken")) });
  assert.throws(() => valibotFormResolver(schema), /async schemas require explicit fields/);
  const fields = valibotFormResolver(v.object({ email: v.string() })).fields;
  const adapter = valibotFormResolver(schema, { fields });
  assert.strictEqual(adapter.fields, fields);
  const verdict = adapter.validate({ email: "ada@example.com" });
  assert.ok(verdict instanceof Promise);
  assert.deepEqual(await verdict, [{ path: "email", code: "check", message: "Taken" }]);
});

test("conversion overrides support unrepresentable fields without bypassing validation", () => {
  const schema = v.object({ born: v.date() });
  const fields = [{ path: "born", kind: "date", isRequired: true, constraints: {} }];
  const adapter = valibotFormResolver(schema, { fields });
  assert.strictEqual(adapter.fields, fields);
  assert.equal(adapter.validate({ born: "not a date" })[0].code, "date");
  assert.deepEqual(adapter.validate({ born: new Date() }), []);
});

test("submission blocks invalid values and preserves input rather than transformed output", async () => {
  const schema = v.object({ age: v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number)) });
  const adapter = valibotFormResolver(schema);
  assert.equal(adapter.fields.find((field) => field.path === "age").kind, "string");
  const form = createForm({ adapter, defaultValues: { age: "bad" } });
  const saved = [];
  assert.equal((await form.submit((root) => { saved.push(root); })).submitted, false);
  assert.deepEqual(saved, []);
  form.reset({ age: "42" });
  assert.equal((await form.submit((root) => { saved.push(root); })).submitted, true);
  assert.deepEqual(saved, [{ age: "42" }]);
});
