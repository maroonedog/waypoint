// `form.adoptIssues` — the `setError` of this library, and why it is a merge
// rather than a cell.
//
// The defect being pinned here is not "the message does not show". Writing
// `issuesCell(path)` by hand always showed the message. The defect is that a
// hand-written cell is invisible to `errorCount` and to submit's `blockedBy`,
// so a form could display "that handle is taken" and submit anyway — and that
// it was cleared or preserved depending on whether the SCHEMA happened to
// mention that path, which is the one thing a server issue is not about.
//
// So every test here asserts on two channels at once wherever it can: what the
// field shows AND what blocks. A change that made them disagree again would
// pass a one-channel test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import {
  createForm,
  errorCountCell,
  issuesCell,
} from "@maroonedog/waypoint/core";

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
  payment: z.enum(["card", "invoice"]),
  items: z.array(z.object({ sku: z.string().min(1) })),
});

const GOOD = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  payment: "card",
  items: [{ sku: "A-1" }, { sku: "B-2" }],
};

const build = (options = {}) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(GOOD),
    ...options,
  });

const settle = () => new Promise((done) => setTimeout(done, 0));

const messagesAt = (form, path) =>
  (form.store.read(issuesCell(path)) ?? []).map((issue) => issue.message);

test("an adopted issue is shown, counted and blocks the submit", async () => {
  const form = build();
  assert.equal((await form.submit(() => {})).submitted, true, "clean to start");

  form.adoptIssues([
    { path: "owner.email", message: "that address is already registered" },
  ]);

  assert.deepEqual(messagesAt(form, "owner.email"), [
    "that address is already registered",
  ]);
  assert.equal(form.store.read(errorCountCell), 1, "counted, not merely shown");

  const outcome = await form.submit(() => {
    assert.fail("the handler must not run while a server issue stands");
  });
  assert.equal(outcome.submitted, false);
  assert.deepEqual(
    outcome.blockedBy.map((issue) => issue.message),
    ["that address is already registered"],
    "it is reported as what blocked, not merely counted"
  );
});

test("it lands on a path with no input and no schema rule at all", () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  assert.deepEqual(messagesAt(form, "payment"), ["the card was declined"]);
  assert.equal(form.store.read(errorCountCell), 1);
});

test("a write at the path drops it even though the pass then re-fills the cell", async () => {
  const form = build();
  form.adoptIssues([{ path: "owner.name", message: "that name is taken" }]);

  form.field("owner.name").setValue("Ad");
  await settle();

  assert.deepEqual(
    messagesAt(form, "owner.name"),
    ["Too small: expected string to have >=3 characters"],
    "a write at the path drops the server's verdict about it — but the pass " +
      "did not WIPE it, which is a different fact and the next test pins it"
  );
});

test("a pass that speaks about the path does not wipe an issue a write did not touch", async () => {
  const form = build();
  form.adoptIssues([{ path: "owner.name", message: "that name is taken" }]);

  // Nothing is written at owner.name. The pass produces an issue there anyway,
  // because a DIFFERENT field went wrong and zod reports the whole root. A
  // hand-written issue cell is overwritten by exactly this, in
  // distribute-issues.ts's second loop.
  form.field("owner.email").setValue("nope");
  await settle();

  assert.deepEqual(messagesAt(form, "owner.name"), ["that name is taken"]);
  assert.equal(form.store.read(errorCountCell), 2);
});

test("the schema's complaint is read first and the server's second", async () => {
  const form = build();
  form.adoptIssues([{ path: "owner.name", message: "that name is taken" }]);
  await form.validate();
  const [first] = messagesAt(form, "owner.name");
  assert.equal(first, "that name is taken", "nothing produced, so it stands alone");

  form.field("owner.email").setValue("not-an-address");
  await settle();
  assert.deepEqual(messagesAt(form, "owner.name"), ["that name is taken"]);
  assert.deepEqual(messagesAt(form, "owner.email"), [
    "Invalid email address",
  ]);
});

test("a write at the path drops it", async () => {
  const form = build();
  form.adoptIssues([{ path: "owner.email", message: "already registered" }]);
  form.field("owner.email").setValue("ada2@example.com");
  await settle();
  assert.deepEqual(messagesAt(form, "owner.email"), []);
  assert.equal(form.store.read(errorCountCell), 0);
});

test("a write at an ancestor and at a descendant both drop it", async () => {
  const above = build();
  above.adoptIssues([{ path: "items[0].sku", message: "sold out" }]);
  above.rows("items").move(0, 1);
  above.rows("items").move(1, 0);
  above.adoptIssues([{ path: "items[0].sku", message: "sold out" }]);
  // An edit INSIDE the row makes a verdict about the row stale.
  above.field("items[0].sku").setValue("A-2");
  await settle();
  assert.deepEqual(messagesAt(above, "items[0].sku"), []);

  const below = build();
  below.adoptIssues([
    { path: "owner", message: "this applicant already exists" },
  ]);
  below.field("owner.email").setValue("ada2@example.com");
  await settle();
  assert.deepEqual(messagesAt(below, "owner"), []);
});

test("an unrelated write leaves it alone, and the prefix test is segment-anchored", async () => {
  const form = build();
  form.adoptIssues([{ path: "owner.name", message: "that name is taken" }]);
  form.field("payment").setValue("invoice");
  await settle();
  assert.deepEqual(messagesAt(form, "owner.name"), ["that name is taken"]);
});

test("one submit is refused by it and the next one gets through", async () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  assert.equal(form.store.read(errorCountCell), 1);

  // Nothing the person could type would ever clear an issue on `payment`, and
  // a button disabled on errorCount would make pressing submit — the one act
  // that clears it — impossible. So the attempt consumes it.
  const refused = await form.submit(() => {
    assert.fail("the first press must not hand the form over");
  });
  assert.equal(refused.submitted, false);
  assert.deepEqual(refused.blockedBy.map((issue) => issue.message), [
    "the card was declined",
  ]);
  assert.deepEqual(messagesAt(form, "payment"), []);
  assert.equal(form.store.read(errorCountCell), 0, "consumed by the attempt");

  let handed = false;
  const accepted = await form.submit(() => {
    handed = true;
  });
  assert.equal(accepted.submitted, true);
  assert.equal(handed, true, "two presses with nothing changed always get through");
});

test("`blockedBy` and `errorCount` agree while the form is being judged", async () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  form.field("owner.name").setValue("Ad");
  const outcome = await form.submit(() => {});

  assert.equal(outcome.submitted, false);
  assert.deepEqual(
    outcome.blockedBy.map((issue) => issue.path).sort(),
    ["owner.name", "payment"],
    "one list feeds the cells, the count and the verdict"
  );
});

test("reset clears it", async () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  form.reset();
  await settle();
  assert.deepEqual(messagesAt(form, "payment"), []);
  assert.equal(form.store.read(errorCountCell), 0);
});

test("a row move carries it to the row's new place", async () => {
  const form = build();
  form.adoptIssues([{ path: "items[0].sku", message: "sold out" }]);
  assert.deepEqual(messagesAt(form, "items[0].sku"), ["sold out"]);

  form.rows("items").move(0, 1);
  await settle();

  assert.deepEqual(messagesAt(form, "items[0].sku"), []);
  assert.deepEqual(
    messagesAt(form, "items[1].sku"),
    ["sold out"],
    "the issue followed the row rather than staying at the index"
  );
  assert.equal(form.store.read(errorCountCell), 1);
});

test("a removed row takes its adopted issue with it", async () => {
  const form = build();
  form.adoptIssues([{ path: "items[0].sku", message: "sold out" }]);
  form.rows("items").remove(0);
  await settle();
  assert.deepEqual(messagesAt(form, "items[0].sku"), []);
  assert.equal(form.store.read(errorCountCell), 0);
});

test("each call replaces the whole answer, so an empty list clears", () => {
  const form = build();
  form.adoptIssues([
    { path: "owner.name", message: "taken" },
    { path: "payment", message: "declined" },
  ]);
  assert.equal(form.store.read(errorCountCell), 2);

  // The second response no longer mentions `owner.name`, which means that
  // complaint is gone — not that it should be kept because nothing overwrote
  // it. Per-path merging would leave it standing with nothing to remove it.
  form.adoptIssues([{ path: "payment", message: "declined" }]);
  assert.deepEqual(messagesAt(form, "owner.name"), []);
  assert.deepEqual(messagesAt(form, "payment"), ["declined"]);

  form.adoptIssues([]);
  assert.deepEqual(messagesAt(form, "payment"), []);
  assert.equal(form.store.read(errorCountCell), 0);
});

test("an adopted warning is shown and does not block, exactly as a produced one", async () => {
  const form = build();
  form.adoptIssues([
    { path: "owner.name", message: "unusual spelling", severity: "warning" },
  ]);
  assert.deepEqual(messagesAt(form, "owner.name"), ["unusual spelling"]);
  assert.equal(form.store.read(errorCountCell), 0);
  assert.equal((await form.submit(() => {})).submitted, true);
});

// THE ROUND TRIP THIS MEMBER EXISTS FOR, and it did not work. `submit` dropped
// the adopted set in a `.finally()`, which also fires for anything the HANDLER
// adopted — so the canonical shape, `await api.save()` inside the handler and
// then `adoptIssues(response.issues)`, ended with errorCount 0 and no issue
// anywhere. The message the server had just sent never reached the screen.
//
// Three shapes, because the bug only showed in two of them: adopting after the
// promise settles always worked, which is how it passed review.
test("an issue the handler adopts survives the submit that adopted it", async () => {
  const form = build();
  const outcome = await form.submit(async () => {
    await Promise.resolve();
    form.adoptIssues([{ path: "owner.name", message: "that handle is taken" }]);
  });

  // This attempt got through — nothing blocked it when it was pressed.
  assert.equal(outcome.submitted, true);
  // And the server's answer is on screen and blocking the next one.
  assert.deepEqual(messagesAt(form, "owner.name"), ["that handle is taken"]);
  assert.equal(form.store.read(errorCountCell), 1);
  assert.deepEqual((await form.submit(() => {})).blockedBy.map((one) => one.path), [
    "owner.name",
  ]);
});

test("the same, adopted synchronously inside the handler", async () => {
  const form = build();
  await form.submit(() => {
    form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  });
  assert.deepEqual(messagesAt(form, "payment"), ["the card was declined"]);
  assert.equal(form.store.read(errorCountCell), 1);
});

test("and when the handler throws after adopting", async () => {
  const form = build();
  await assert.rejects(
    form.submit(() => {
      form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
      throw new Error("network");
    })
  );
  assert.deepEqual(messagesAt(form, "payment"), ["the card was declined"]);
});

// The other half of the same rule, and the reason the drop exists at all: an
// answer that was ALREADY held when the press happened is consumed by it, so a
// path with no input to edit cannot hold errorCount above zero for ever.
test("an answer held before the press is still consumed by it", async () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "the card was declined" }]);
  assert.equal(form.store.read(errorCountCell), 1);

  const refused = await form.submit(() => {});
  assert.equal(refused.submitted, false);
  assert.deepEqual(refused.blockedBy.map((one) => one.path), ["payment"]);

  // Dropped, so the next press asks the server again rather than being
  // refused for ever by an answer nothing on screen can clear.
  assert.equal(form.store.read(errorCountCell), 0);
  assert.equal((await form.submit(() => {})).submitted, true);
});
