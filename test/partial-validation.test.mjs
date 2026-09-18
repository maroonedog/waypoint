import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createForm } from "@maroonedog/waypoint/core";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { settle } from "./support/scheduled-pass.mjs";

const fields = ["a", "b", "ab"].map(path => ({ path, kind: "string", isRequired: true, constraints: {} }));
const issue = path => ({ path, message: `${path} invalid` });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test("Zod partial execution skips unrelated validators and preserves their errors", async () => {
  const counts = { a: 0, b: 0 };
  const schema = z.object({
    a: z.string().refine(value => { counts.a++; return value.length > 0; }),
    b: z.string().refine(value => { counts.b++; return value.length > 0; }),
  });
  const form = createForm({ adapter: zodFormResolver(schema, { partial: true }), defaultValues: { a: "", b: "" } });
  await form.validate();
  assert.equal(form.errorCount.read(), 2);
  counts.a = counts.b = 0;
  form.field("a").setValue("valid");
  await settle();
  assert.deepEqual(counts, { a: 1, b: 0 });
  assert.equal(form.field("a").sources.issues.read().length, 0);
  assert.equal(form.field("b").sources.issues.read().length, 1);
  assert.equal(form.errorCount.read(), 1);
  assert.deepEqual(form.blockedBy.read().map(x => x.path), ["b"]);
  const result = await form.submit(() => assert.fail("unvalidated sibling must block submit"));
  assert.ok(result);
  assert.deepEqual(counts, { a: 2, b: 1 });
});

test("field validate, scoped form validate and probes use the partial adapter", async () => {
  const calls = [];
  const form = createForm({ adapter: {
    fields, validate() { assert.fail("unexpected full pass"); },
    validatePartial(root, paths) { calls.push({ root, paths }); return { paths, issues: paths.map(issue) }; },
  }, defaultValues: { a: "old", b: "old" }, validateOn: "submit" });
  assert.deepEqual(await form.field("a").validate(), [issue("a")]);
  assert.deepEqual(await form.validate(["b"]), [issue("b")]);
  const before = form.blockedBy.read();
  assert.deepEqual(await form.field("a").issuesFor("probe"), [issue("a")]);
  assert.equal(form.readRoot().a, "old");
  assert.equal(form.blockedBy.read(), before);
  assert.deepEqual(calls.map(call => call.paths), [["a"], ["b"], ["a"]]);
  assert.equal(calls[2].root.a, "probe");
  assert.throws(() => form.validate(["items[*]"]), /not a place/);
});

test("edits coalesce scopes and dependency-expanded verdicts clear dependent issues", async () => {
  const calls = [];
  const form = createForm({ adapter: {
    fields, validate: () => [issue("a"), issue("b"), issue("ab")],
    validatePartial(root, paths) { calls.push(paths); return { paths: ["a", "b"], issues: [] }; },
  } });
  await form.validate();
  form.field("a").setValue("changed");
  form.field("b").setValue("changed");
  await settle();
  assert.deepEqual(calls, [["a", "b"]]);
  assert.deepEqual(form.blockedBy.read(), [issue("ab")]);
});

test("superseding async partial passes retain unfinished scopes and reject stale results", async () => {
  const calls = [];
  const form = createForm({ adapter: {
    fields, validate: () => [],
    validatePartial(root, paths, signal) {
      const done = deferred(); calls.push({ paths, signal, ...done }); return done.promise;
    },
  } });
  const first = form.field("a").validate();
  const second = form.field("b").validate();
  assert.deepEqual(calls.map(call => call.paths), [["a"], ["a", "b"]]);
  assert.equal(calls[0].signal.aborted, true);
  calls[1].resolve({ paths: ["a", "b"], issues: [issue("b")] });
  await second;
  calls[0].resolve({ paths: ["a"], issues: [issue("a")] });
  await first;
  assert.deepEqual(form.blockedBy.read(), [issue("b")]);
  assert.equal(form.validating.read(), false);
});

test("failed partial work is included in a subsequent retry", async () => {
  const calls = [];
  const form = createForm({ adapter: {
    fields, validate: () => [],
    validatePartial(root, paths) {
      calls.push(paths);
      return calls.length === 1 ? Promise.reject(new Error("offline")) : { paths, issues: [] };
    },
  } });
  await assert.rejects(form.field("a").validate(), /offline/);
  await form.field("b").validate();
  assert.deepEqual(calls, [["a"], ["a", "b"]]);
  assert.equal(form.validating.read(), false);
});

test("an unfinished full pass cannot be replaced with only one field's verdict", async () => {
  const first = deferred();
  let full = 0, partial = 0;
  const form = createForm({ adapter: {
    fields, validate: () => ++full === 1 ? first.promise : [issue("b")],
    validatePartial(root, paths) { partial++; return { paths, issues: [] }; },
  } });
  const pending = form.validate();
  await form.field("a").validate();
  first.resolve([issue("a")]);
  await pending;
  assert.equal(full, 2);
  assert.equal(partial, 0);
  assert.deepEqual(form.blockedBy.read(), [issue("b")]);
});

test("invalid adapter replacement scopes cannot erase stored issues", async () => {
  for (const result of [ { paths: ["b"], issues: [] }, { paths: ["a"], issues: [issue("b")] } ]) {
    const form = createForm({ adapter: { fields, validate: () => [issue("a")], validatePartial: () => result } });
    await form.validate();
    assert.throws(() => form.field("a").validate(), /must cover/);
    assert.deepEqual(form.blockedBy.read(), [issue("a")]);
  }
});

test("adopted issues and nonparticipating fields survive scoped validation", async () => {
  const form = createForm({ adapter: {
    fields, validate: () => [issue("b")], validatePartial: (root, paths) => ({ paths, issues: [] }),
  } });
  form.setParticipating("b", false);
  await settle();
  form.adoptIssues([issue("ab")]);
  await form.field("a").validate();
  assert.deepEqual(form.blockedBy.read(), [issue("ab")]);
});

test("Zod validates a nested top-level subtree including object refinements", async () => {
  let unrelated = 0;
  const adapter = zodFormResolver(z.object({
    account: z.object({ password: z.string(), confirmation: z.string() })
      .refine(value => value.password === value.confirmation, { path: ["confirmation"] }),
    other: z.string().refine(() => { unrelated++; return true; }),
  }), { partial: true });
  const result = await adapter.validatePartial({ account: { password: "a", confirmation: "b" }, other: "" }, ["account.password"]);
  assert.deepEqual(result.paths, ["account"]);
  assert.equal(result.issues[0].path, "account.confirmation");
  assert.equal(unrelated, 0);
});

test("Zod root refinements and strict unknown keys fall back to full validation", async () => {
  const schema = z.object({ a: z.string(), b: z.string() }).refine(value => value.a === value.b, { path: ["b"] });
  const adapter = zodFormResolver(schema, { partial: true });
  const result = await adapter.validatePartial({ a: "a", b: "b" }, ["a"]);
  assert.deepEqual(result.paths, [""]);
  assert.equal(result.issues[0].path, "b");
  const strict = zodFormResolver(z.strictObject({ a: z.string(), b: z.string() }), { partial: true });
  assert.deepEqual((await strict.validatePartial({ a: "a", b: "b" }, ["a"])).issues, []);
  const unknown = await strict.validatePartial({ a: "a", b: "b", extra: true }, ["a"]);
  assert.deepEqual(unknown.paths, [""]);
  assert.equal(unknown.issues[0].code, "unrecognized_keys");
});

test("Zod async refinements skip unrelated work; array scopes recheck sibling rows", async () => {
  let other = 0;
  const adapter = zodFormResolver(z.object({
    rows: z.array(z.object({ name: z.string().refine(async value => value.length > 0) })),
    other: z.string().refine(() => { other++; return true; }),
  }), { partial: true });
  const result = await adapter.validatePartial({ rows: [{ name: "ok" }, { name: "" }], other: "" }, ["rows[0].name"]);
  assert.deepEqual(result.paths, ["rows"]);
  assert.equal(result.issues[0].path, "rows[1].name");
  assert.equal(other, 0);
});

test("adapters without partial support retain full validation semantics", async () => {
  let calls = 0;
  const form = createForm({ adapter: { fields, validate: () => { calls++; return [issue("b")]; } } });
  assert.deepEqual(await form.field("a").validate(), []);
  assert.equal(calls, 1);
  assert.deepEqual(form.blockedBy.read(), [issue("b")]);
  assert.equal(zodFormResolver(z.object({ a: z.string() })).validatePartial, undefined);
});

test("row removal and reset replace the full verdict instead of retaining obsolete indices", async () => {
  const form = createForm({
    adapter: zodFormResolver(z.object({ rows: z.array(z.object({ name: z.string().min(1) })) }), { partial: true }),
    defaultValues: { rows: [{ name: "ok" }, { name: "" }] },
  });
  await form.validate();
  assert.equal(form.blockedBy.read()[0].path, "rows[1].name");
  form.rows("rows").remove(1);
  await settle();
  assert.deepEqual(form.blockedBy.read(), []);
  form.reset({ rows: [{ name: "" }] });
  await settle();
  assert.equal(form.blockedBy.read()[0].path, "rows[0].name");
});

test("a queued edit invalidates an async answer before the next pass starts", async () => {
  const done = deferred();
  let calls = 0;
  const form = createForm({ adapter: {
    fields, validate: () => [],
    validatePartial(root, paths) {
      return ++calls === 1 ? done.promise : { paths, issues: [] };
    },
  } });
  const first = form.field("a").validate();
  const observed = [];
  const unsubscribe = form.blockedBy.subscribe(() => observed.push(form.blockedBy.read()));
  done.resolve({ paths: ["a"], issues: [issue("a")] });
  form.field("b").setValue("new");
  await first;
  await settle();
  assert.deepEqual(form.blockedBy.read(), []);
  assert.ok(observed.every(issues => issues.length === 0));
  unsubscribe();
});

test("root issues force a complete replacement and failed scheduled work can retry", async () => {
  let full = 0, partial = 0;
  const form = createForm({ adapter: {
    fields, validate: () => ++full === 1 ? [issue("")] : [],
    validatePartial(root, paths) {
      if (++partial === 1) throw new Error("temporarily unavailable");
      return { paths, issues: [] };
    },
  } });
  await form.validate();
  await form.field("a").validate();
  assert.equal(full, 2);
  assert.deepEqual(form.blockedBy.read(), []);
  form.field("a").setValue("new");
  await settle();
  await form.field("b").validate();
  assert.equal(partial, 2);
  assert.equal(form.validating.read(), false);
});
