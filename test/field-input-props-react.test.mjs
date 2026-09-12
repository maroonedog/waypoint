// The same bag, spread onto real elements — which is a second claim and not
// the first one checked twice.
//
// field-input-props.test.mjs settles what `buildInputProps` puts in the bag. A
// bag holding the right keys and an element carrying the right attributes are
// different facts, and React is the reason they are: it renames props on the
// way out (`htmlFor` becomes `for`, `minLength` becomes `minlength`), drops
// ones it does not recognise without saying so, and treats `checked` and
// `value` as alternatives rather than as two keys a checkbox could carry
// together. Nothing read off the bag catches a key React discards on the way
// to the node. So no assertion here is made about the bag: the attributes are
// read off the node, and what a spread handler wrote is read off the form.
//
// The ids are the part that cannot be inspected in a bag at all. "A label, a
// description and an error all address one input" is a relation among four
// elements, and the collision it guards against — two forms on one page whose
// fields are both called `name` — only happens once both forms are actually
// standing on the page.
//
// Where the pure half deliberately calls the handler instead of driving the
// node, this file deliberately does the reverse. The select test dispatches a
// real change event through `dom.window.Event`, because a select's value is
// chosen on the node and the claim is that the binding hears it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "./support/dom.mjs";
import { mountIntoDocument as render } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useField, useUncontrolledField } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h, Fragment } = React;

const SCHEMA = z.object({
  owner: z.object({
    name: z
      .string()
      .min(3, "too short")
      .meta({ description: "As it appears on the card" }),
    email: z.email(),
  }),
  quantity: z.number().min(1),
  agreed: z.boolean(),
  payment: z.enum(["invoice", "card"]),
});

const DEFAULTS = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  quantity: 1,
  agreed: false,
  payment: "invoice",
};

const buildForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });

/** A field drawn the way the library now says to draw one: four spreads. */
const WiredRow = ({ path }) => {
  const field = useField(path);
  return h(
    Fragment,
    null,
    h("label", { ...field.labelProps }, path),
    h("input", { ...field.inputProps }),
    field.descriptionProps === undefined
      ? null
      : h("p", { ...field.descriptionProps }, field.descriptor?.description),
    h(
      "p",
      { ...field.errorProps },
      field.issues.map((issue) => issue.message).join(" ")
    )
  );
};

test("the label, the description and the error all address the input", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.name" }))
  );

  const input = container.querySelector("input");
  const label = container.querySelector("label");
  const paragraphs = container.querySelectorAll("p");

  assert.notEqual(input.id, "");
  assert.equal(label.htmlFor, input.id);
  assert.equal(paragraphs[0].id, `${input.id}-description`);
  assert.equal(paragraphs[1].id, `${input.id}-error`);
  assert.equal(paragraphs[1].getAttribute("role"), "alert");
  assert.equal(
    input.getAttribute("aria-describedby"),
    paragraphs[0].id,
    "a clean field points only at its description"
  );
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(input.getAttribute("type"), "text");
  assert.equal(input.getAttribute("minlength"), "3");
  root.unmount();
});

test("an issue adds the error id to what the input points at", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.name" }))
  );
  const input = container.querySelector("input");

  await act(async () => form.field("owner.name").setValue("ab"));

  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(
    input.getAttribute("aria-describedby"),
    `${input.id}-description ${input.id}-error`
  );
  root.unmount();
});

test("two forms on one page do not give two inputs the same id", async () => {
  const first = buildForm();
  const second = buildForm();
  const { container, root } = await render(
    h(
      Fragment,
      null,
      h(FormProvider, { form: first }, h(WiredRow, { path: "owner.name" })),
      h(FormProvider, { form: second }, h(WiredRow, { path: "owner.name" }))
    )
  );

  const inputs = container.querySelectorAll("input");
  const labels = container.querySelectorAll("label");
  assert.notEqual(inputs[0].id, inputs[1].id);
  assert.equal(labels[0].htmlFor, inputs[0].id);
  assert.equal(labels[1].htmlFor, inputs[1].id);
  root.unmount();
});

test("a declared format reaches the DOM as the type", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.email" }))
  );
  assert.equal(container.querySelector("input").getAttribute("type"), "email");
  root.unmount();
});

test("a checkbox spread from the binding actually toggles the cell", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "agreed" }))
  );
  const input = container.querySelector("input");
  assert.equal(input.getAttribute("type"), "checkbox");
  assert.equal(input.checked, false);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), true);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), false);
  root.unmount();
});

test("a number spread from the binding writes a number, not a string", async () => {
  const form = buildForm();
  let bag;
  const Row = () => {
    bag = useField("quantity").inputProps;
    return h("input", { ...bag });
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));
  assert.equal(container.querySelector("input").getAttribute("type"), "number");

  await act(async () => bag.onChange({ target: { value: "12" } }));

  assert.equal(form.field("quantity").sources.value.read(), 12);
  assert.deepEqual(form.field("quantity").sources.issues.read(), []);
  root.unmount();
});

test("a select spread from the binding writes the declared choice", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useField("payment");
    return h(
      "select",
      { ...field.inputProps },
      (field.descriptor?.choices ?? []).map((choice) =>
        h(
          "option",
          { key: String(choice.value), value: String(choice.value) },
          choice.label
        )
      )
    );
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const select = container.querySelector("select");
  assert.equal(select.hasAttribute("type"), false);
  assert.equal(select.options.length, 2);

  await act(async () => {
    select.value = "card";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(form.field("payment").sources.value.read(), "card");
  root.unmount();
});

// ---------------------------------------------------------------------------
// The uncontrolled binding, which used to return no props at all.
// ---------------------------------------------------------------------------

test("the uncontrolled bag carries the descriptor, and is spreadable", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useUncontrolledField("owner.name");
    return h(
      Fragment,
      null,
      h("label", { ...field.labelProps }, "name"),
      h("input", { ...field.inputProps })
    );
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const input = container.querySelector("input");
  assert.equal(input.value, "Ada Lovelace", "the node still starts from the cell");
  assert.equal(input.getAttribute("type"), "text");
  assert.equal(input.getAttribute("minlength"), "3");
  assert.equal(input.getAttribute("name"), "owner.name");
  assert.equal(container.querySelector("label").htmlFor, input.id);
  assert.equal(
    input.getAttribute("aria-describedby"),
    `${input.id}-description`
  );

  await act(async () => form.field("owner.name").setValue("ab"));
  assert.equal(input.getAttribute("aria-invalid"), "true");
  root.unmount();
});

test("an uncontrolled checkbox is checked rather than defaulted to a string", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useUncontrolledField("agreed");
    return h("input", { ...field.inputProps });
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const input = container.querySelector("input");
  assert.equal(input.getAttribute("type"), "checkbox");
  assert.equal(input.checked, false);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), true);

  // And a write from outside still reaches the node without a render.
  await act(async () => form.field("agreed").setValue(false));
  assert.equal(input.checked, false);
  root.unmount();
});
