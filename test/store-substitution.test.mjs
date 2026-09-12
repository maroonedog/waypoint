// The store is a SEAM, and this file is about the seam rather than about
// either side of it.
//
// `createForm` takes a store, which means the library is making a promise to
// somebody who never reads its source: put a different one in and nothing above
// notices. Nothing above is the whole runtime — the fan-out, the pass, the
// diff, the hooks, the tree. A promise like that is never broken in the middle;
// it is broken at the boundary, by the adapter that translates one shape into
// the other, and the defect recorded below is exactly that shape. The adapter
// staged writes in a batch but answered reads from zustand, so a second
// read-modify-write of the root inside one batch started from the pre-batch
// value and silently dropped the first — invisible to the store's own tests,
// invisible to the runtime's own tests, visible only where the two meet.
//
// WHY THE RENDERED TEST IS HERE and not with the other rendered ones. It is not
// a test of the slice. The slice is already pinned by form-runtime.test.mjs
// against the shipped store, and this runs the identical scenario with one
// thing changed — so the assertion is not "two renders happened", it is "the
// same two renders happened as with the other store". Moving it in with its
// twin would leave two tests that look like copies of each other and read as
// one of them being redundant, when their DIFFERENCE is the entire subject.
//
// This is not custom-store.test.mjs, which asks what the conformance kit does
// to a store written carelessly. Here the kit is pointed at the two stores
// this repository actually stands behind, and the question is whether a form
// built on either of them is the same form.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { renderSlice, type } from "./support/postcode-slice.mjs";
import { DEFAULTS, SCHEMA } from "./support/postcode-form.mjs";

const { act } = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const {
  createForm,
  createCellStore,
  assertFormStoreContract,
  issuesCell,
  ROOT_CELL,
} = await import("@maroonedog/waypoint/core");
const { createZustandCellStore } = await import("@maroonedog/waypoint/store-zustand");
const { createStore } = await import("zustand/vanilla");

// 5 - R3
test("the shipped store and a zustand store both satisfy the contract", () => {
  const failures = [];
  const expect = (holds, what) => {
    if (!holds) failures.push(what);
  };
  assertFormStoreContract(() => createCellStore(), expect);
  assertFormStoreContract(
    () => createZustandCellStore(createStore(() => ({}))),
    expect
  );
  assert.deepEqual(failures, []);
});

test("the slice behaves identically with the zustand store injected", async () => {
  const store = createZustandCellStore(createStore(() => ({})));
  const { form, counters, container, root } = await renderSlice(store);
  const before = { ...counters };
  await type(container, "billing", "100");
  assert.equal(counters.billing, before.billing + 2, "value, then issues");
  assert.equal(counters.shipping, before.shipping);
  await act(async () => undefined);
  assert.deepEqual(
    form.store.read(issuesCell("billing.postcode")).map((i) => i.message),
    ["must match shipping"]
  );
  await act(async () => root.unmount());
});

// The defect this closes: the adapter staged writes but answered reads from
// zustand, so a second read-modify-write of the root inside one batch started
// from the pre-batch value and dropped the first.
test("batched writes to the same cell build on each other in every store", () => {
  for (const build of [
    () => createCellStore(),
    () => createZustandCellStore(createStore(() => ({}))),
  ]) {
    const form = createForm({
      adapter: zodFormResolver(SCHEMA),
      defaultValues: structuredClone(DEFAULTS),
      store: build(),
    });
    form.store.batch(() => {
      form.field("billing.postcode").setValue("111");
      form.field("shipping.postcode").setValue("222");
    });
    assert.deepEqual(form.store.read(ROOT_CELL), {
      billing: { postcode: "111" },
      shipping: { postcode: "222" },
    });
  }
});
