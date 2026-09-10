// The rest of the runtime: the descriptor tree, submit, participation, reset.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import {
  createForm,
  buildDescriptorTree,
  errorCountCell,
  issuesCell,
  submitCountCell,
  rowsCell,
} from "form-core";

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
  plan: z.enum(["free", "pro"]),
  items: z.array(z.object({ sku: z.string().min(1) })),
});

const GOOD = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  plan: "free",
  items: [{ sku: "A-1" }],
};

const build = (defaultValues = GOOD) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
  });

test("the tree carries the containers the descriptors imply", () => {
  const tree = buildDescriptorTree(zodFormResolver(SCHEMA).fields);
  assert.deepEqual(
    tree.map((node) => [node.kind, node.path]),
    [
      ["group", "owner"],
      ["field", "plan"],
      ["list", "items"],
    ]
  );
  const [owner, , items] = tree;
  assert.deepEqual(
    owner.children.map((node) => node.path),
    ["owner.name", "owner.email"]
  );
  assert.deepEqual(
    items.children.map((node) => [node.kind, node.path]),
    [["field", "items[*].sku"]]
  );
});

test("a form with nothing wrong hands its root to the handler", async () => {
  const form = build();
  let handed;
  const outcome = await form.submit((root) => {
    handed = root;
  });
  assert.deepEqual(outcome, { submitted: true, blockedBy: [] });
  assert.deepEqual(handed, GOOD);
  assert.equal(form.store.read(submitCountCell), 1);
});

// The defect this exists to catch: a form that submits because the offending
// input happened to be off screen.
test("submit is blocked by a field no component has ever rendered", async () => {
  const form = build({ ...GOOD, owner: { name: "A", email: "nope" } });
  let called = false;
  const outcome = await form.submit(() => {
    called = true;
  });
  assert.equal(called, false, "the handler did not run");
  assert.equal(outcome.submitted, false);
  assert.deepEqual(
    outcome.blockedBy.map((issue) => issue.path).sort(),
    ["owner.email", "owner.name"]
  );
});

test("a handler that throws leaves the form not submitted", async () => {
  const form = build();
  await assert.rejects(
    () =>
      form.submit(() => {
        throw new Error("the server said no");
      }),
    /the server said no/
  );
  assert.equal(form.store.read(submitCountCell), 1, "the attempt still counted");
});

test("a dormant subtree stops blocking and keeps its values", async () => {
  const form = build({ ...GOOD, owner: { name: "A", email: "nope" } });
  form.validate();
  assert.equal(form.store.read(errorCountCell), 2);

  form.setParticipating("owner", false);
  form.validate();

  assert.equal(form.store.read(errorCountCell), 0, "nothing blocks any more");
  assert.deepEqual(
    form.store.read(issuesCell("owner.email")),
    [],
    "the dormant field reports nothing"
  );
  assert.equal(
    form.readRoot().owner.email,
    "nope",
    "the value is still there for a cross-field rule to read"
  );

  const outcome = await form.submit(() => undefined);
  assert.equal(outcome.submitted, true);
});

test("switching a subtree back on makes it block again", () => {
  const form = build({ ...GOOD, owner: { name: "A", email: "nope" } });
  form.setParticipating("owner", false);
  form.validate();
  assert.equal(form.store.read(errorCountCell), 0);

  form.setParticipating("owner", true);
  form.validate();
  assert.equal(form.store.read(errorCountCell), 2);
});

test("reset puts the values, the rows and the verdict back", () => {
  const form = build();
  form.field("owner.name").setValue("X");
  form.rows("items").insert(1, { sku: "B-2" });
  form.validate();
  assert.equal(form.store.read(errorCountCell), 1);
  assert.equal(form.readRoot().items.length, 2);

  form.reset();

  assert.deepEqual(form.readRoot(), GOOD);
  assert.equal(form.store.read(rowsCell("items")).length, 1);
  assert.deepEqual(form.store.read(issuesCell("owner.name")), undefined);
  form.validate();
  assert.equal(form.store.read(errorCountCell), 0);
});

test("reset can be given a different starting point", () => {
  const form = build();
  form.reset({ ...GOOD, plan: "pro", items: [] });
  assert.equal(form.readRoot().plan, "pro");
  assert.deepEqual(form.store.read(rowsCell("items")), []);
});
