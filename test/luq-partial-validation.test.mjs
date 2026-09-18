import { test } from "node:test";
import assert from "node:assert/strict";
import { Builder } from "@maroonedog/luq";
import { customPlugin } from "@maroonedog/luq/plugins/custom";
import { requiredPlugin } from "@maroonedog/luq/plugins/required";
import { objectPlugin } from "@maroonedog/luq/plugins/object";
import { stringMinPlugin } from "@maroonedog/luq/plugins/stringMin";
import { stringMaxPlugin } from "@maroonedog/luq/plugins/stringMax";
import { compareFieldPlugin } from "@maroonedog/luq/plugins/compareField";
import { toStandardJsonSchema } from "@maroonedog/luq/standard-schema";
import { luqFormResolver } from "@maroonedog/waypoint/resolver-luq";
import { createForm } from "@maroonedog/waypoint/core";

test("Luq selected plans skip unrelated rules and retain unrelated errors until submit", async () => {
  const calls = { a: 0, b: 0 };
  const validator = Builder().use(customPlugin).for()
    .v("a", rule => rule.string.custom(value => { calls.a++; return value.length > 0; }))
    .v("b", rule => rule.string.custom(value => { calls.b++; return value.length > 0; })).build();
  const adapter = luqFormResolver(toStandardJsonSchema(validator), { partial: true, libraryOptions: { unrepresentable: "omit" } });
  const form = createForm({ adapter, defaultValues: { a: "", b: "" } });
  await form.validate();
  calls.a = calls.b = 0;
  form.field("a").setValue("fixed");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, { a: 1, b: 0 });
  assert.deepEqual(form.blockedBy.read().map(issue => issue.path), ["b"]);
  assert.equal(form.blockedBy.read()[0].code, "custom");
  await form.submit(() => assert.fail("must validate sibling on submit"));
  assert.deepEqual(calls, { a: 2, b: 1 });
});

test("declared cross-field dependencies expand transitively and clear dependent errors", async () => {
  const validator = Builder().use(compareFieldPlugin).for()
    .v("password", rule => rule.string)
    .v("confirmation", rule => rule.string.compareField("password"))
    .v("again", rule => rule.string.compareField("confirmation")).build();
  const adapter = luqFormResolver(toStandardJsonSchema(validator), {
    partial: true, libraryOptions: { unrepresentable: "omit" },
    dependencies: { password: ["confirmation"], confirmation: ["again"], again: ["password"] },
  });
  const form = createForm({ adapter, defaultValues: { password: "wrong", confirmation: "ok", again: "ok" } });
  await form.validate();
  assert.ok(form.errorCount.read() > 0);
  form.field("password").setValue("ok");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(form.errorCount.read(), 0);
  assert.deepEqual(adapter.validatePartial(form.readRoot(), ["password"]).paths, ["password", "confirmation", "again"]);
});

test("nested requests retain parent constraints and skip other top-level declarations", () => {
  let other = 0;
  const validator = Builder().use(objectPlugin).use(requiredPlugin).use(stringMinPlugin).use(customPlugin).for()
    .v("owner", rule => rule.object.required())
    .v("owner.name", rule => rule.string.required().min(3))
    .v("other", rule => rule.string.custom(() => { other++; return false; })).build();
  const adapter = luqFormResolver(toStandardJsonSchema(validator), { partial: true });
  const result = adapter.validatePartial({ owner: { name: "x" }, other: "" }, ["owner.name"]);
  assert.deepEqual(result.paths, ["owner"]);
  assert.equal(result.issues[0].path, "owner.name");
  assert.equal(other, 0);
  assert.ok(adapter.validatePartial({ other: "" }, ["owner.name"]).issues.some(issue => issue.path === "owner"));
});

test("all selected failures are collected and selection fallback uses the full validator", () => {
  const validator = Builder().use(stringMinPlugin).use(stringMaxPlugin).for()
    .v("a", rule => rule.string.min(5).max(1)).build();
  const describable = toStandardJsonSchema(validator);
  const adapter = luqFormResolver(describable, { partial: true });
  assert.equal(adapter.validatePartial({ a: "xx" }, ["a"]).issues.length, 2);
  assert.deepEqual(adapter.validatePartial({ a: "xx" }, ["unknown"]).paths, [""]);
  assert.deepEqual(adapter.validatePartial(null, ["a"]).paths, [""]);
  assert.equal(luqFormResolver(describable).validatePartial, undefined);
  const legacy = { ...describable };
  const fallback = luqFormResolver(legacy, { partial: true }).validatePartial({ a: "xx" }, ["a"]);
  assert.deepEqual(fallback.paths, [""]);
  assert.deepEqual(fallback.issues, adapter.validate({ a: "xx" }));
});

test("a concrete row request validates its array subtree and preserves other row issues", () => {
  const validator = Builder().use(stringMinPlugin).for()
    .v("items[*].name", rule => rule.string.min(2))
    .v("other", rule => rule.string.min(2)).build();
  const adapter = luqFormResolver(toStandardJsonSchema(validator), { partial: true });
  const result = adapter.validatePartial({ items: [{ name: "ok" }, { name: "x" }], other: "x" }, ["items[0].name"]);
  assert.deepEqual(result.paths, ["items"]);
  assert.deepEqual(result.issues.map(issue => issue.path), ["items[1].name"]);
});
