// What a keystroke costs, counted in components — and what a component paints
// the moment it comes back.
//
// Every test here renders the first vertical slice, and three of the five
// assert on RENDER COUNTS rather than on the tree. That is deliberate and it is
// the only place the claim is observable: a form that re-renders the whole
// screen on every keystroke is correct by every assertion about values and
// issues that could be written, and is exactly the thing this library exists
// not to be. So in those three the counters are the assertion, and a number one
// larger than it should be is the failure — which is why they say "the shell
// did not re-render" three times between them.
//
// The second half is the same mechanism approached from the side where it
// broke. Cells are written for readers, so a field with no mounted component
// has no reader and the fan-out passes it by; the two defects pinned below are
// both "what it paints when it comes back" — the value written while it was
// away, and the error that appeared while it was away. Both need a document, a
// toggle and a commit to state at all: they are about the first render after a
// remount, and there is no such moment without React.
//
// What these tests can only see INDIRECTLY — that a pass writes one issue cell
// and not two — is the subject of runtime-writes.test.mjs, which measures it on
// the store rather than inferring it from a count.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { renderSlice, type } from "./support/postcode-slice.mjs";
import { find } from "./support/testid-lookup.mjs";

const { act } = await import("react");
const { issuesCell, readValueAt } = await import("@maroonedog/waypoint/core");

// 1 - R4
test("typing into one field re-renders only that one component", async () => {
  const { counters, container, root } = await renderSlice();

  // A keystroke that also makes an error appear costs two renders of the field
  // that owns it: one for the value, one for the issues the following pass
  // writes. Neither reaches any other component.
  const before = { ...counters };
  await type(container, "billing", "1");
  assert.equal(counters.billing, before.billing + 2, "value, then issues");
  assert.equal(counters.shipping, before.shipping, "shipping did not re-render");
  assert.equal(counters.shell, before.shell, "the shell did not re-render");

  // A keystroke that leaves the verdict unchanged costs exactly one: the issue
  // list has the same content, so the diff writes no issue cell at all.
  const settled = { ...counters };
  await type(container, "billing", "12");
  assert.equal(counters.billing, settled.billing + 1, "value only");
  assert.equal(counters.shipping, settled.shipping, "shipping did not re-render");
  assert.equal(counters.shell, settled.shell, "the shell did not re-render");
  await act(async () => root.unmount());
});

// 2 - R2, values
test("a rule reads a sibling whose component is not mounted", async () => {
  const { form, container, root } = await renderSlice();
  await type(container, "shipping", "999");
  await act(async () => find(container, "toggle").click());
  assert.equal(find(container, "shipping"), null, "shipping is unmounted");

  await type(container, "billing", "100");
  let issues = [];
  await act(async () => {
    issues = form.field("billing.postcode").validate();
  });
  assert.deepEqual(
    issues.map((i) => i.message),
    ["must match shipping"]
  );

  await type(container, "billing", "999");
  await act(async () => {
    issues = form.field("billing.postcode").validate();
  });
  assert.deepEqual(issues, []);
  await act(async () => root.unmount());
});

// 4 - the cross-field direction
test("editing one field moves the error onto the other path", async () => {
  const { form, counters, container, root } = await renderSlice();
  await type(container, "billing", "100");
  await act(async () => undefined);
  assert.deepEqual(
    form.store.read(issuesCell("billing.postcode")).map((i) => i.message),
    ["must match shipping"]
  );

  const before = { ...counters };
  await type(container, "shipping", "100");
  await act(async () => undefined);

  assert.deepEqual(form.store.read(issuesCell("billing.postcode")), []);
  assert.equal(
    counters.billing,
    before.billing + 1,
    "billing re-rendered because its issues moved"
  );
  assert.equal(counters.shell, before.shell, "the shell did not re-render");
  await act(async () => root.unmount());
});

// 4b - remounting paints the right error immediately
test("a field remounted later paints its error on its first render", async () => {
  const { form, counters, container, root } = await renderSlice();

  // Unmount the field that will carry the error, then create the error while
  // it is off screen.
  await act(async () => find(container, "toggle-billing").click());
  assert.equal(find(container, "billing"), null, "billing is unmounted");
  await type(container, "shipping", "999");
  await act(async () => undefined);
  assert.equal(form.store.read(issuesCell("billing.postcode")).length, 1);

  const before = counters.billing;
  await act(async () => find(container, "toggle-billing").click());
  assert.equal(
    counters.billing,
    before + 1,
    "billing painted once, with the error already in hand"
  );
  assert.equal(
    find(container, "billing-error").textContent,
    "must match shipping"
  );
  await act(async () => root.unmount());
});

// The defect this closes: the fan-out writes only cells someone is reading, so
// a cell closed while the root moved under it kept a value the form no longer
// held. It painted on remount and the next keystroke wrote it back.
test("a field remounted after a write it did not see paints the current value", async () => {
  const { form, container, root } = await renderSlice();
  await type(container, "billing", "aaa");
  await act(async () => find(container, "toggle-billing").click());

  await act(async () => form.field("billing").setValue({ postcode: "zzz" }));
  assert.equal(readValueAt(form.readRoot(), "billing.postcode"), "zzz");

  await act(async () => find(container, "toggle-billing").click());
  assert.equal(find(container, "billing").value, "zzz", "painted the root");

  await type(container, "billing", "zzz1");
  assert.equal(
    readValueAt(form.readRoot(), "billing.postcode"),
    "zzz1",
    "the keystroke built on the real value"
  );
  await act(async () => root.unmount());
});
