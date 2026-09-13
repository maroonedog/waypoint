// Naming the form you meant to read from — the one mistake the registry cannot
// catch.
//
// The registry knows which paths belong to which form. What it cannot know is
// which provider a component will be rendered under: that is decided by the
// tree, at runtime, by whoever imports the component — and a component moved
// into the wrong provider still type-checks perfectly, because its paths are
// still that form's paths. The QUALIFYING HEAD is the declaration that closes
// it: `"order:billing.postcode"` states the form the path believes it is
// inside, and the provider states which form is actually there.
//
// EVERY PATH NOW CARRIES THAT DECLARATION, which is what this guard was
// waiting for. It used to be reachable only from a call that passed a key as a
// separate argument; a call that passed none handed it `undefined` and skipped
// it, so the spelling with nothing in front of it was the spelling nothing
// checked.
//
// AND IT THROWS, which is the opposite of the rule its sibling file argues for
// about a path it does not recognise — warn, do not throw. The two are
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
const { z } = await import("zod");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useFieldValue } = await import("@maroonedog/waypoint/react");

const { createElement: h } = React;

test("naming a form that is not the enclosing one throws and says which", async () => {
  function Screen() {
    useFieldValue("order:billing.postcode");
    return null;
  }
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm(), formKey: "checkout", partial: true }, h(Screen))
  );
  assert.ok(escaped !== null, "expected a mismatched key to throw");
  assert.match(escaped.message, /"order"/);
  assert.match(escaped.message, /"checkout"/);
});

test("naming the enclosing form is accepted", async () => {
  function Screen() {
    const postcode = useFieldValue("order:billing.postcode");
    return h("span", { id: "v" }, String(postcode));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form: orderForm(), formKey: "order", partial: true }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

test("a form named where it was created needs no second name", async () => {
  // Two places to write the key is two places for it to be wrong, and the one
  // that is wrong refuses every path in the subtree rather than one. So the
  // provider prefers the name the form already carries, and an application
  // that named its form at `createForm` says nothing further.
  const form = createForm({
    key: "order",
    adapter: zodFormResolver(
      z.object({ billing: z.object({ postcode: z.string() }) })
    ),
    defaultValues: { billing: { postcode: "100-0001" } },
  });
  function Screen() {
    return h("span", { id: "v" }, String(useFieldValue("order:billing.postcode")));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form, partial: true }, h(Screen))
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
    h(FormProvider, { form: orderForm(), formKey: "anything", partial: true }, h(Screen))
  );
  assert.equal(escaped, null);
  assert.equal(text(container, "v"), "100-0001");
  root.unmount();
});

// WHERE A PREFIX ENDS IS LEXICAL: a head qualifies a path only when it stands
// before the first `.` or `[`. `Record<string, T>` puts `${string}` into the
// path grammar and a record key may contain a colon, so a rule that split on
// the first colon would steal one — and a form called `byId` does not exist,
// so the read would throw on a path that is perfectly correct.
//
// The rule is lexical rather than "is this head a registered key" because this
// side cannot ask the second question: the registry exists only in type
// positions, and running code holds the one key its provider carries. A
// question only one side can answer leaves the two disagreeing about which
// strings are qualified at all, and that gap is where a checked spelling
// becomes a thrown one.
test("a colon inside a record key is part of the path, not a form name", async () => {
  const form = createForm({
    adapter: zodFormResolver(
      z.object({ byId: z.record(z.string(), z.object({ amount: z.number() })) })
    ),
    defaultValues: { byId: { "a:b": { amount: 42 } } },
  });
  function Screen() {
    return h("span", { id: "v" }, String(useFieldValue("byId.a:b.amount")));
  }
  const { container, root, escaped } = await mountCatching(
    h(FormProvider, { form, partial: true }, h(Screen))
  );
  assert.equal(escaped, null, "the first `.` comes first, so there is no head");
  assert.equal(text(container, "v"), "42");
  root.unmount();
});

// Two type-checked places to say one thing, and the prop used to win in
// silence. A form built `createForm({ key: "order" })` and rendered as
// `formKey="checkout"` answered every `checkout:` path beneath it: no call
// was wrong, the two declarations simply disagreed, and the mismatch a
// qualified path exists to catch had been arranged one level above the paths.
test("a provider whose formKey contradicts the form's own key is refused", async () => {
  const { escaped } = await mountCatching(
    h(FormProvider, { form: orderForm("order"), formKey: "checkout", partial: true }, null)
  );
  assert.match(String(escaped), /names itself "order"/);
});
