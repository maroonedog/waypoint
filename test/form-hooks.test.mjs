// Hooks that know which paths exist.
//
// The types do the work in TypeScript — the registry states them once and
// every hook reads them from there. This file is the half that has to hold in
// JavaScript, where there are no types to help.
//
// A path the form does not declare is WARNED ABOUT, not thrown. Such a field
// is inert — it draws nothing and validates nothing — but it cannot let bad
// data through, because the pass judges the whole ROOT: the verdict and the
// submit gate stay correct, and what actually broke is one field's display.
// Throwing would take the whole form down for that.
//
// Eleven of the thirteen tests below therefore put one question to a string: is
// this a path this form has? Warn, stay silent, or — for `items[*]`, the single
// case where guessing would address a row nobody asked for — throw. The two
// that ask something else say so in their names: "two forms on one screen stay
// independent" and "a component needs nothing wrapped around it".
//
// No hook in this file names a form. That is the line between it and
// hook-form-key.test.mjs, where every hook does: here the enclosing provider
// answers, there the call site does.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountCatching, text } from "./support/warning-mount.mjs";
import { orderForm } from "./support/order-form.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const {
  FormProvider,
  useField,
  useFieldIssues,
  useFieldValue,
} = await import("@maroonedog/waypoint/react");

const { act, createElement: h } = React;

/** A form that declares none of the order's paths. */
const OTHER = z.object({ unrelated: z.object({ token: z.string() }) });

const otherForm = () =>
  createForm({
    adapter: zodFormResolver(OTHER),
    defaultValues: { unrelated: { token: "x" } },
  });

test("a declared path works exactly as the untyped hook does", async () => {
  function Screen() {
    const postcode = useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "");
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("a misspelt path warns and leaves the rest of the form standing", async () => {
  function Screen() {
    const typo = useField("billing.postcod");
    const fine = useField("shipping.postcode");
    return h(
      "div",
      null,
      h("span", { id: "typo" }, String(typo.value)),
      h("span", { id: "fine" }, String(fine.value))
    );
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );

  assert.equal(escaped, null, "a typo must not take the form down");
  assert.match(warned, /billing\.postcod/);
  assert.match(warned, /draw nothing and validate nothing/);
  // The inert field, and its neighbour that is entirely unaffected.
  assert.equal(text(container, "typo"), "undefined");
  assert.equal(text(container, "fine"), "150-0001");
  root.unmount();
});

test("the warning names the paths it might have meant", async () => {
  function Screen() {
    useFieldValue("billing.postcod");
    return null;
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.match(warned, /Did you mean/);
  assert.match(warned, /billing\.postcode/);
  root.unmount();
});

test("the same path is warned about once, not once per render", async () => {
  function Screen() {
    useFieldValue("billing.nope");
    return null;
  }
  const form = orderForm();
  const { root, warnings } = await mountCatching(
    h(FormProvider, { form }, h(Screen))
  );
  await act(async () => form.field("billing.postcode").setValue("x"));
  assert.equal(warnings.length, 1);
  root.unmount();
});

test("hooks rendered under a DIFFERENT form's provider warn", async () => {
  // The one mistake the types cannot see. The store the component is actually
  // inside is what answers, so it needs no separate check in the hooks.
  function Screen() {
    useFieldValue("billing.postcode");
    return null;
  }
  const { root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: otherForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.match(warned, /not a field this form has/);
  root.unmount();
});

test("two forms on one screen stay independent", async () => {
  function Show({ id }) {
    const postcode = useFieldValue("billing.postcode");
    return h("span", { id }, String(postcode));
  }
  const a = orderForm();
  const b = orderForm();
  await act(async () => b.field("billing.postcode").setValue("999-9999"));

  const { container, root, escaped } = await mountCatching(
    h(
      React.Fragment,
      null,
      h(FormProvider, { form: a }, h(Show, { id: "a" })),
      h(FormProvider, { form: b }, h(Show, { id: "b" }))
    )
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "a"), "100-0001");
  assert.equal(text(container, "b"), "999-9999");
  root.unmount();
});

test("a component needs nothing wrapped around it", async () => {
  // There is no scope to be inside or outside of. A path is a path.
  function Screen() {
    const postcode = useField("billing.postcode");
    return h("span", { id: "v" }, String(postcode.value));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("a rule where a place is needed throws, and names the column reading", async () => {
  // Not a mis-addressing: the path is declared and correct, and binding index
  // zero instead would silently address a row nobody asked for.
  function Screen() {
    useField("items[*].sku");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.ok(escaped !== null, "expected the rule-as-place to throw");
  assert.match(escaped.message, /is a rule, not a place/);
  assert.match(escaped.message, /useFieldValues/);
});

test("a concrete index is addressable, and reads that row", async () => {
  // items[0].sku is a PLACE in the value, not a rule. The declared union has
  // never contained a bare index; what changed is that the hooks now accept
  // one, and check it as the rule it belongs to.
  function Screen() {
    const sku = useField("items[0].sku");
    return h("span", { id: "v" }, String(sku.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "", "a real row is not a mistake");
  assert.equal(text(container, "v"), "a");
  root.unmount();
});

test("a computed row index is addressable too", async () => {
  function Screen() {
    const which = 1;
    const sku = useField(`items[${which}].sku`);
    return h("span", { id: "v" }, String(sku.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "");
  assert.equal(text(container, "v"), "b");
  root.unmount();
});

// ---------------------------------------------------------------------------
// The check belongs to the STORE, not to the typed hooks. Two consequences,
// and the second is a bug this pins closed.
// ---------------------------------------------------------------------------

test("the check is the store's, so every hook gets it", async () => {
  // The hole as it actually shipped: the check lived in a hook factory, so
  // useField — which the examples and the showcase all use — was silent. It
  // now lives in form.field(), which every hook here funnels through.
  function Screen() {
    const typo = useField("billing.postcod");
    return h("span", { id: "v" }, String(typo.value));
  }
  const { container, root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.match(warned, /billing.postcod/);
  assert.equal(text(container, "v"), "undefined");
  root.unmount();
});

test("a container is addressable, and must not warn", async () => {
  // A resolver emits LEAF descriptors only, so "items" and "billing" have
  // none — and both are legitimate: an array-level issue lands on the first
  // and reading a whole object is ordinary. Asking "has a descriptor" warned
  // about both, which is why the question is "is it a leaf or an ancestor".
  function Screen() {
    useFieldIssues("items");   // 配列レベルの issue
    useField("billing");       // オブジェクトまるごと
    useFieldIssues("items[0]"); // 行そのもの
    return null;
  }
  const { root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(warned, "", "a container is not a mistake");
  root.unmount();
});

test("a row that does not exist yet is addressable", async () => {
  // items[9] is a real field of the form whose row has not been inserted. That
  // is a question about data, not about addressing.
  function Screen() {
    useField("items[9].sku");
    return null;
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.equal(warned, "");
  root.unmount();
});
