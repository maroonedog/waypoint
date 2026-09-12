// Naming the form you meant to read from — the one mistake the registry cannot
// catch.
//
// The registry knows which paths belong to which form. What it cannot know is
// which provider a component will be rendered under: that is decided by the
// tree, at runtime, by whoever imports the component — and a component moved
// into the wrong provider still type-checks perfectly, because its paths are
// still that form's paths. `formKey` is the declaration that closes it. A hook
// given a form name states the form it believes it is inside, and the provider
// states which form is actually there.
//
// AND IT THROWS, which is the opposite of the rule its sibling file argues for
// about a path it does not recognise — warn, do not throw. (That file has one
// throw of its own, for `items[*]`, and its banner names it.) The two are
// consistent, and the difference is how much is wrong. A mis-typed path is one
// inert field on an otherwise correct form, so warning is right:
// the root is still judged, the submit gate still holds, and taking the screen
// down would trade a display defect for an outage. A disagreement about the
// form is not one field. It says this entire subtree is reading and writing a
// store nobody intended, so every hook under it is answering from the wrong
// place — there is no correct partial behaviour left to preserve, and the
// value a component would paint is another form's data wearing this one's
// label. So it throws, and the message names both sides, because "wrong form"
// is unactionable unless the reader is told which two forms are being
// confused.
//
// The unkeyed case is not a gap: a hook that names no form cannot be told
// apart from a component deliberately shared between forms, and what happens
// to it — the enclosing form answers, and an absent path warns — is pinned in
// form-hooks.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountCatching, text } from "./support/warning-mount.mjs";
import { orderForm } from "./support/order-form.mjs";

const React = await import("react");
const { FormProvider, useFieldValue } = await import("@maroonedog/waypoint/react");

const { createElement: h } = React;

test("naming a form that is not the enclosing one throws and says which", async () => {
  function Screen() {
    useFieldValue("order", "billing.postcode");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm(), formKey: "checkout" }, h(Screen))
  );
  assert.ok(escaped !== null, "expected a mismatched key to throw");
  assert.match(escaped.message, /"order"/);
  assert.match(escaped.message, /"checkout"/);
});

test("naming the enclosing form is accepted", async () => {
  function Screen() {
    const postcode = useFieldValue("order", "billing.postcode");
    return h("span", { id: "v" }, String(postcode));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm(), formKey: "order" }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("naming no form accepts whichever provider is there", async () => {
  // What a component shared by two forms does. It gives up telling them
  // apart, and nothing else.
  function Screen() {
    const postcode = useFieldValue("billing.postcode");
    return h("span", { id: "v" }, String(postcode));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm(), formKey: "anything" }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});
