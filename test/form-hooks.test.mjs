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
// The question this file puts to a string is therefore: is this a path this
// form has? Warn, stay silent, or — for `items[*]`, where guessing would
// address a row nobody asked for — throw.
//
// THE PATHS HERE CARRY NO FORM IN FRONT OF THEM, and that is the arm under
// test. An application with one registered form writes its paths bare, so bare
// is a spelling that has to keep working, and this is where it is held. The
// qualified arm is `hook-form-key.test.mjs`: there the call site names the
// form, here the enclosing provider answers.
//
// The last section is about the DIAGNOSTIC rather than about addressing, and
// it is where both spellings appear. A warning is read by somebody searching
// their own source for what they typed, so what it quotes has to be the
// spelling they wrote — which means a qualified call has to produce a
// qualified message, suggestions included.
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

// ---------------------------------------------------------------------------
// The warning is written in the caller's vocabulary, whichever one that is.
//
// A form NAMED where it is created is the shape the provider is built around:
// it derives its key from the form rather than being told the same string a
// second time, so there is one name and nothing to drift. That name is also
// the only thing here that knows what a path in this form looks like written
// out, which is why it is what the message is qualified with.
// ---------------------------------------------------------------------------

/** The order form again, named — so the provider and the message agree. */
const namedOrderForm = () =>
  createForm({
    key: "order",
    adapter: zodFormResolver(
      z.object({
        billing: z.object({ postcode: z.string(), city: z.string() }),
      })
    ),
    defaultValues: { billing: { postcode: "100-0001", city: "Chiyoda" } },
  });

test("a qualified typo is quoted the way it was written", async () => {
  // Searched on the bare path, because a form's own vocabulary has no prefix
  // in it; quoted with the prefix back on, because that is the string the
  // reader will search their own source for.
  function Screen() {
    useField("order:billing.postcod");
    return null;
  }
  const { root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: namedOrderForm() }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.match(warned, /"order:billing\.postcod"/);
  root.unmount();
});

test("the suggestions are qualified too, so they can be pasted back", async () => {
  // The half that is easy to leave out and the worse half to leave out. A
  // qualified spelling handed to a search over unqualified paths resembles
  // none of them, so the suggestions vanish exactly where one is wanted; and a
  // suggestion returned with the prefix still off cannot be pasted into a
  // source file where more than one form is registered.
  function Screen() {
    useField("order:billing.ctiy");
    return null;
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: namedOrderForm() }, h(Screen))
  );
  assert.match(warned, /Did you mean/);
  assert.match(warned, /order:billing\.city/);
  root.unmount();
});

test("an unnamed form leaves the prefix off, which is the spelling it accepts", async () => {
  // A form nobody named is a form nobody had to tell apart, so an unprefixed
  // path is legal against it and an unprefixed suggestion is one the reader
  // can paste. The message has no name to use because the application never
  // wrote one down.
  function Screen() {
    useField("billing.citty");
    return null;
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(Screen))
  );
  assert.match(warned, /"billing\.citty"/);
  assert.match(warned, /Did you mean: [^?]*\bbilling\.city\b/);
  assert.doesNotMatch(warned, /form:/);
  root.unmount();
});
