// The caller's own element, wired — and the four merges that are silent when
// they go wrong.
//
// A spread is the obvious way to do this and it loses one side of every
// collision without saying so: whichever `onChange` is written second wins and
// the other never runs, and `aria-describedby` is a space-separated list where
// the loser simply stops being announced. Neither shows up as an error, in the
// console or in the DOM — the field just stops working, or stops being read
// out, and the reader is looking at correct-looking markup.
//
// So each of those is asserted from the rendered DOM rather than from the prop
// object: what a screen reader gets is the attribute, not the bag.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useField, useUncontrolledField } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h } = React;

const SCHEMA = z.object({
  name: z
    .string()
    .min(3, "at least 3")
    .meta({ title: "Name", description: "As it appears on the card" }),
});

const build = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: { name: "" },
  });

const probe = (container) => container.querySelector("input");

test("the caller's own props survive, and the field's arrive", async () => {
  function Screen() {
    const field = useField("name");
    return field.decorate(
      h("input", { className: "mine", placeholder: "type here" })
    );
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form: build() }, h(Screen))
  );
  const input = probe(container);
  assert.equal(input.getAttribute("class"), "mine");
  assert.equal(input.getAttribute("placeholder"), "type here");
  assert.equal(input.getAttribute("name"), "name", "the field's own");
  assert.equal(input.getAttribute("minlength"), "3", "off the descriptor");
  assert.equal(input.hasAttribute("id"), true);
  root.unmount();
});

test("both onChange handlers run, and the cell is written first", async () => {
  const seen = [];
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      field.decorate(
        h("input", {
          onChange: () => seen.push(field.path + "=" + String(field.value)),
        })
      ),
      h("span", { id: "value" }, String(field.value))
    );
  }
  const form = build();
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form }, h(Screen))
  );
  const input = probe(container);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      container.ownerDocument.defaultView.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(input, "Ada");
    input.dispatchEvent(new container.ownerDocument.defaultView.Event("input", { bubbles: true }));
  });
  assert.equal(container.querySelector("#value").textContent, "Ada");
  assert.deepEqual(seen, ["name="], "the caller's handler ran, once");
  assert.equal(
    form.field("name").sources.value.read(),
    "Ada",
    "and ours wrote the cell"
  );
  root.unmount();
});

test("aria-describedby joins rather than replacing", async () => {
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      field.decorate(h("input", { "aria-describedby": "house-rules" })),
      h("p", { id: "house-rules" }, "Our rules")
    );
  }
  const form = build();
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form }, h(Screen))
  );
  await act(async () => {
    await form.validate();
  });
  const described = probe(container).getAttribute("aria-describedby").split(" ");
  assert.ok(
    described.includes("house-rules"),
    "the caller's own description is still announced"
  );
  assert.equal(described.length, 3, "description, error, and the caller's");
  assert.equal(described.at(-1), "house-rules", "ours first, theirs after");
  root.unmount();
});

test("the field wins on identity, whatever the caller asked for", async () => {
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      field.decorate(h("label", { htmlFor: "somewhere-else" }, "Name"), "label"),
      field.decorate(h("input", { id: "mine", name: "theirs" }))
    );
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form: build() }, h(Screen))
  );
  const input = probe(container);
  const label = container.querySelector("label");
  assert.notEqual(input.getAttribute("id"), "mine");
  assert.equal(input.getAttribute("name"), "name");
  assert.equal(
    label.getAttribute("for"),
    input.getAttribute("id"),
    "the label still points at the input it belongs to"
  );
  root.unmount();
});

test("a description the schema did not declare hands the element back untouched", async () => {
  const UNDESCRIBED = z.object({ name: z.string().meta({ title: "Name" }) });
  const form = createForm({
    adapter: zodFormResolver(UNDESCRIBED),
    defaultValues: { name: "" },
  });
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      field.decorate(h("span", { className: "help" }, "help"), "description"),
      field.decorate(h("input", {}))
    );
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form }, h(Screen))
  );
  const help = container.querySelector(".help");
  assert.equal(help.hasAttribute("id"), false, "there is no id to give it");
  root.unmount();
});

test("the uncontrolled binding composes refs instead of losing one", async () => {
  const mine = { current: null };
  function Screen() {
    const field = useUncontrolledField("name");
    return field.decorate(h("input", { ref: mine }));
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form: build() }, h(Screen))
  );
  const input = probe(container);
  assert.equal(mine.current, input, "the caller's ref was assigned");
  assert.equal(input.getAttribute("name"), "name");
  root.unmount();
});
