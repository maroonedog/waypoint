// What the runtime writes, what it declines to write, and what it refuses to
// write anywhere — with nothing rendered.
//
// Three claims that can only be MEASURED here, because in a rendered test each
// of them arrives one step removed from its cause, as a render count:
//
//   Asking a field a question writes nothing. `issuesFor` answers about a value
//   the person has not committed to, so it must not leave that value, or the
//   verdict about it, behind in the form.
//
//   A pass writes only the issue cells whose CONTENT changed. Every pass
//   produces a verdict for every path; the ones that say what they said last
//   time must not reach the store, or every keystroke wakes every field.
//
//   A path that names a RULE rather than a place is refused instead of guessed.
//   The defect: `items[*]` had no case in the concrete grammar, so it parsed as
//   a member literally named "*" and a write at it replaced the whole array —
//   a write in a place nobody addressed, which is why it belongs with the other
//   two rather than with the addressing hooks.
//
// So this file builds a form and never a document. It counts writes with a
// store it has wrapped, and compares serialised roots, which is what these
// claims are about. Put a React tree in the way and the same regression is
// reported as "a component rendered twice" — a true sentence that sends the
// reader into the reconciler to look for a bug that is in the pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createCellStore, createForm } from "@maroonedog/waypoint/core";
import { buildForm, DEFAULTS, SCHEMA } from "./support/postcode-form.mjs";

// 3 - R2, isolation
// No component is rendered at all. A field addressed by path is reachable
// whether or not React has ever been involved, which is the point.
test("a field validates on its own, and check writes nothing", () => {
  const form = buildForm();
  const adapter = zodFormResolver(SCHEMA);
  form.field("billing.postcode").setValue("100");

  const fromField = form.field("billing.postcode").validate();
  const fromForm = adapter
    .validate(form.readRoot())
    .filter((issue) => issue.path === "billing.postcode");
  assert.deepEqual(fromField, fromForm);

  const rootBefore = JSON.stringify(form.readRoot());
  const probed = form.field("billing.postcode").issuesFor("");
  assert.deepEqual(probed, []);
  assert.equal(
    JSON.stringify(form.readRoot()),
    rootBefore,
    "check wrote nothing"
  );
  assert.equal(form.field("billing.postcode").sources.value.read(), "100");
});

// The defect this closes: `[*]` has no case in the concrete grammar, so it
// parsed as a member named "*" and a write replaced the whole array.
test("addressing a field by a declared path is refused, not guessed", () => {
  const form = buildForm();
  assert.throws(
    () => form.field("items[*].quantity"),
    (error) =>
      error instanceof TypeError && /is a rule, not a place/.test(error.message)
  );
});

// 6 - the diff
test("a pass writes only the issue cells whose content changed", async () => {
  const store = createCellStore();
  const written = [];
  const spied = {
    ...store,
    write: (key, next) => {
      written.push(key);
      store.write(key, next);
    },
  };
  const form = createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
    store: spied,
  });

  form.validate();
  written.length = 0;
  form.validate();
  assert.deepEqual(
    written.filter((key) => key.startsWith("issues:")),
    [],
    "a pass that changes nothing writes no issue cell"
  );

  form.field("billing.postcode").setValue("100");
  written.length = 0;
  form.validate();
  assert.deepEqual(
    written.filter((key) => key.startsWith("issues:")),
    ["issues:billing.postcode"],
    "a pass that changes one field writes one issue cell"
  );
});
