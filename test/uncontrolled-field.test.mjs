// A field whose value lives in the DOM node rather than in React's state.
//
// `useField` subscribes to the value cell, so typing re-renders. Measured at
// 201 fields that costs a commit React spends on the whole sibling list — 212
// changed fibers for a keystroke that moved no verdict. `useUncontrolledField`
// subscribes imperatively and writes the node, so typing reaches React not at
// all, and the counts lane records 0 commits for the same keystroke.
//
// These tests pin the four things that makes true: the node starts from the
// cell, typing does not render, a programmatic write still reaches the node,
// and an issue still does render because that is the part React must draw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "./support/dom.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useUncontrolledField } = await import("@maroonedog/waypoint/react");

const { act, createElement: h } = React;

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3, "too short"), nick: z.string() }),
});

const GOOD = { owner: { name: "Ada Lovelace", nick: "Ada" } };

/** Counts its own renders, so "did React run" is a fact rather than a guess. */
const makeLeaf = (path, renders) =>
  function Leaf() {
    const field = useUncontrolledField(path);
    renders.count += 1;
    return h(
      "label",
      null,
      h("input", {
        "data-path": path,
        defaultValue: field.defaultValue,
        ref: field.ref,
        onChange: field.onChange,
        onBlur: field.onBlur,
      }),
      h("em", { "data-message": path }, field.issues[0]?.message ?? "")
    );
  };

async function mount(paths) {
  const form = createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(GOOD),
  });
  const renders = Object.fromEntries(paths.map((p) => [p, { count: 0 }]));
  const { container, root } = await mountIntoDocument(
    h(
      FormProvider,
      { form },
      paths.map((path) => h(makeLeaf(path, renders[path]), { key: path }))
    )
  );
  const input = (path) =>
    container.querySelector(`[data-path=${JSON.stringify(path)}]`);
  const message = (path) =>
    container.querySelector(`[data-message=${JSON.stringify(path)}]`)
      ?.textContent ?? "";
  return { form, container, root, renders, input, message };
}

/** Types the way a person does: the prototype setter, then a change event. */
const type = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value"
  ).set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
};

test("the node starts from the cell", async () => {
  const { input, root } = await mount(["owner.name"]);
  assert.equal(input("owner.name").value, "Ada Lovelace");
  root.unmount();
});

test("typing does not render the field", async () => {
  const { input, renders, form, root } = await mount(["owner.name"]);
  const before = renders["owner.name"].count;

  await act(async () => type(input("owner.name"), "Ada Byron"));

  assert.equal(
    renders["owner.name"].count,
    before,
    "the component rendered for a keystroke that moved no verdict"
  );
  // It still reached the store, which is the half that has to keep working.
  assert.equal(form.field("owner.name").sources.value.read(), "Ada Byron");
  root.unmount();
});

test("a programmatic write still reaches the node", async () => {
  const { input, form, root } = await mount(["owner.name"]);

  await act(async () => form.field("owner.name").setValue("Grace Hopper"));

  assert.equal(input("owner.name").value, "Grace Hopper");
  root.unmount();
});

test("a reset reaches every node, including one nobody typed in", async () => {
  const { input, form, root } = await mount(["owner.name", "owner.nick"]);
  await act(async () => type(input("owner.name"), "Typed"));

  await act(async () => form.reset({ owner: { name: "Back", nick: "To" } }));

  assert.equal(input("owner.name").value, "Back");
  assert.equal(input("owner.nick").value, "To");
  root.unmount();
});

test("an issue does render, because React is what draws it", async () => {
  const { input, message, renders, root } = await mount(["owner.name"]);
  const before = renders["owner.name"].count;

  await act(async () => type(input("owner.name"), "ab"));

  assert.equal(message("owner.name"), "too short");
  assert.ok(
    renders["owner.name"].count > before,
    "the message appeared without React rendering, which cannot happen"
  );
  root.unmount();
});

test("typing in one field does not render another", async () => {
  const { input, renders, root } = await mount(["owner.name", "owner.nick"]);
  const before = renders["owner.nick"].count;

  await act(async () => type(input("owner.name"), "Ada Byron"));

  assert.equal(renders["owner.nick"].count, before);
  root.unmount();
});
