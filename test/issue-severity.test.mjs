// What `FormIssue.severity` costs a submit, and what it does not.
//
// The vendor here is hand-rolled rather than zod or luq, because neither of
// the shipped resolvers can produce a warning: zod has no warning level and
// the luq resolver drops warnings before they reach the form. A vendor that
// marks severity is exactly the case the contract declares and the runtime
// had to start honouring, so the test writes one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createForm, errorCountCell, issuesCell } from "@maroonedog/form-contract/core";

const FIELDS = [
  { path: "nickname", kind: "string", isRequired: false },
  { path: "email", kind: "string", isRequired: true },
];

const DEFAULTS = { nickname: "ada", email: "ada@example.com" };

const WARNING = {
  path: "nickname",
  message: "shorter than most people use",
  severity: "warning",
};
const ERROR = { path: "email", message: "not an address", severity: "error" };
const UNMARKED = { path: "email", message: "not an address" };

const formProducing = (...issues) =>
  createForm({
    adapter: { fields: FIELDS, validate: () => issues },
    defaultValues: structuredClone(DEFAULTS),
  });

test("a form whose only issue is a warning submits", async () => {
  const form = formProducing(WARNING);
  let handed;
  const outcome = await form.submit((root) => {
    handed = root;
  });
  assert.deepEqual(outcome, { submitted: true, blockedBy: [] });
  assert.deepEqual(handed, DEFAULTS);
  assert.equal(form.store.read(errorCountCell), 0, "a warning is not an error");
});

test("the field still shows the warning it did not block on", async () => {
  const form = formProducing(WARNING);
  await form.validate();
  assert.deepEqual(
    form.store.read(issuesCell("nickname")).map((issue) => issue.message),
    ["shorter than most people use"]
  );
  assert.equal(form.store.read(errorCountCell), 0);
});

test("a warning beside an error does not soften the error", async () => {
  const form = formProducing(WARNING, ERROR);
  let handed = "not called";
  const outcome = await form.submit((root) => {
    handed = root;
  });
  assert.equal(outcome.submitted, false);
  assert.equal(handed, "not called");
  assert.deepEqual(
    outcome.blockedBy.map((issue) => issue.message),
    ["not an address"],
    "only the error is reported as blocking"
  );
  assert.equal(form.store.read(errorCountCell), 1);
});

test("an issue with no severity blocks, because absence is not consent", async () => {
  const form = formProducing(UNMARKED);
  const outcome = await form.submit(() => undefined);
  assert.equal(outcome.submitted, false);
  assert.deepEqual(outcome.blockedBy, [UNMARKED]);
  assert.equal(form.store.read(errorCountCell), 1);
});

// Named for what it actually does: the warning is on a participating path and
// the error is on a dormant one, so the two exclusions have to compose.
test("a dormant error beside a live warning lets a submit through", async () => {
  const form = formProducing(WARNING, ERROR);
  form.setParticipating("email", false);
  const outcome = await form.submit(() => undefined);
  assert.deepEqual(outcome, { submitted: true, blockedBy: [] });
  assert.equal(form.store.read(errorCountCell), 0);
});
