import { test } from "node:test";
import assert from "node:assert/strict";
import { createForm } from "@maroonedog/waypoint/core";
import { createEmailValidation, waitForQuiet } from "../examples/async-validation/src/email-validation.mjs";

const valid = { email: "new@example.com", name: "Ada" };
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve: value => resolve(value) };
};

test("local failures are synchronous and never start a network lookup", () => {
  const validation = createEmailValidation({ lookup: async () => { assert.fail("network"); } });
  const issues = validation.adapter.validate({ email: "bad", name: "" });
  assert.ok(Array.isArray(issues));
  assert.deepEqual(issues.map(i => i.path), ["email", "name"]);
});

test("unrelated edits reuse a completed answer; expiry and submission recheck", async () => {
  let calls = 0, pauses = 0, time = 0;
  const validation = createEmailValidation({
    lookup: async () => { calls++; return calls < 3; },
    pause: async () => { pauses++; }, now: () => time, cacheMs: 10,
  });
  const form = createForm({ adapter: validation.adapter, defaultValues: valid, validateOn: "submit" });
  await form.validate();
  form.field("name").setValue("Grace");
  await form.validate();
  assert.equal(calls, 1);
  time = 11;
  await form.validate();
  assert.equal(calls, 2);
  const outcome = await validation.submit(form, () => assert.fail("taken email submitted"));
  assert.equal(calls, 3);
  assert.equal(pauses, 2, "submit skips the typing delay");
  assert.equal(outcome.submitted, false);
  assert.equal(outcome.blockedBy[0].code, "email_taken");
});

test("superseded network results cannot overwrite the verdict or populate the cache", async () => {
  const responses = [];
  const signals = [];
  const validation = createEmailValidation({
    pause: async () => {},
    lookup: (email, signal) => {
      const response = deferred(); responses.push(response); signals.push(signal);
      return response.promise;
    },
  });
  const form = createForm({ adapter: validation.adapter, defaultValues: valid, validateOn: "submit" });
  const first = form.validate();
  const rejected = assert.rejects(first, { name: "AbortError" });
  await Promise.resolve();
  form.field("email").setValue("other@example.com");
  const second = form.validate();
  await Promise.resolve();
  assert.equal(signals[0].aborted, true);
  responses[1].resolve(true);
  await second;
  responses[0].resolve(false);
  await rejected;
  assert.equal(form.errorCount.read(), 0);
  form.field("email").setValue(valid.email);
  const third = form.validate();
  await Promise.resolve();
  assert.equal(responses.length, 3);
  responses[2].resolve(true);
  await third;
});

test("transport failure blocks submission, is not cached, and can be retried", async () => {
  let online = false, saved;
  const validation = createEmailValidation({
    lookup: async () => { if (!online) throw new Error("offline"); return true; },
    pause: async () => {},
  });
  const form = createForm({ adapter: validation.adapter, defaultValues: valid, validateOn: "submit" });
  const failed = await validation.submit(form, () => assert.fail("offline submission"));
  assert.equal(failed.blockedBy[0].code, "lookup_failed");
  online = true;
  const success = await validation.submit(form, root => { saved = root; });
  assert.equal(success.submitted, true);
  assert.deepEqual(saved, valid);
});

test("aborting the debounce rejects promptly before its timer expires", async () => {
  const controller = new AbortController();
  const pause = waitForQuiet(60_000, controller.signal);
  controller.abort();
  await assert.rejects(pause, { name: "AbortError" });
  await assert.rejects(waitForQuiet(60_000, controller.signal), { name: "AbortError" });
});
