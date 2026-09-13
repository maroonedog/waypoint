// The four things a form binding has to do, asked of the Vue entry and read
// out of the DOM: a field is drawn from the schema, typing reaches the cell, a
// refused value says so, and a submit that cannot go through names what
// stopped it.
//
// WHY THESE ARE ASSERTED AGAINST THE DOM AND NOT AGAINST THE BINDING. Every
// value in the four prop bags already has a test on the React side, and those
// tests are about `../dom`, which is now shared. What is unproven here is the
// half that is Vue's: whether an attribute bag written for one framework's
// prop conventions actually lands as attributes when the other one renders it,
// and whether a keystroke gets from a native event through Vue's handler
// binding to a cell. Neither question can be answered by reading the bag.
//
// THE SCHEMA IS LOCAL rather than one of the shared fixtures, because these
// tests are about what a DESCRIPTOR becomes on an element — a length, a
// format, a description, a required flag — and the shared forms were chosen
// for other questions. owner-form.mjs also carries a hazard written into its
// own header about hardcoded path lists, which this file would silently join.
//
// EVERY PROVIDER IS `partial`. Each screen below binds one or two paths out of
// a form that declares more, which is the other direction of the coverage
// report and has its own file; without the prop, its warning would land beside
// whatever the test is actually reading.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { blur, find, mountIntoDocument, typeInto } from "./support/vue-root.mjs";
import { settle } from "./support/scheduled-pass.mjs";

const { z } = await import("zod");
const { h } = await import("vue");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useField, useFormStatus } = await import(
  "@maroonedog/waypoint/vue"
);

const SCHEMA = z.object({
  owner: z.object({
    name: z.string().min(3).max(40).describe("As it appears on the card"),
    email: z.email(),
  }),
});

const GOOD = { owner: { name: "Ada Lovelace", email: "ada@example.com" } };

const newForm = (defaultValues = GOOD) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(defaultValues),
  });

/** One screen under one provider, which is what every test here mounts. */
const mountUnder = (form, screen, providerProps = {}) =>
  mountIntoDocument({
    setup: () => () =>
      h(
        FormProvider,
        { form, partial: true, ...providerProps },
        { default: () => h(screen) }
      ),
  });

/** A label, an input and a message line, wired from one binding and nothing else. */
const wiredField = (path, options) => ({
  setup() {
    const field = useField(path, options);
    return () =>
      h("div", null, [
        h("label", field.labelProps, "Name"),
        h("input", field.inputProps),
        field.descriptionProps === undefined
          ? null
          : h("p", field.descriptionProps, field.descriptor?.description),
        h("p", field.errorProps, field.issues[0]?.message ?? ""),
      ]);
  },
});

test("a field is drawn from the schema: its label, its constraints and its aria wiring", () => {
  const form = newForm();
  const { container, app } = mountUnder(form, wiredField("owner.name"));
  const input = container.querySelector("input");
  const label = container.querySelector("label");
  const description = container.querySelector("p");

  // The label points at the input, and the id is scoped rather than the bare
  // path — see field-element-ids.ts for why a path alone was not enough.
  assert.equal(label.htmlFor, input.id);
  assert.notEqual(input.id, "owner.name");
  assert.ok(input.id.endsWith("owner.name"));
  assert.equal(input.name, "owner.name");

  // The constraints, off the schema and onto the element.
  assert.equal(input.type, "text");
  assert.equal(input.required, true);
  assert.equal(input.minLength, 3);
  assert.equal(input.maxLength, 40);
  assert.equal(input.value, "Ada Lovelace");

  // The description is drawn and pointed at, and nothing is wrong yet, so the
  // message id is not in the list and the field is not marked invalid.
  assert.equal(description.textContent, "As it appears on the card");
  assert.equal(input.getAttribute("aria-describedby"), description.id);
  assert.equal(input.getAttribute("aria-invalid"), null);
  app.unmount();
});

test("a declared format becomes the input type", () => {
  const form = newForm();
  const { container, app } = mountUnder(form, wiredField("owner.email"));
  assert.equal(container.querySelector("input").type, "email");
  app.unmount();
});

test("typing writes the cell", async () => {
  const form = newForm();
  const { container, app } = mountUnder(form, wiredField("owner.name"));
  const input = container.querySelector("input");

  typeInto(input, "Grace Hopper");
  assert.equal(
    form.field("owner.name").sources.value.read(),
    "Grace Hopper",
    "the cell has to move on the keystroke and not on the blur"
  );

  await settle();
  assert.equal(container.querySelector("input").value, "Grace Hopper");
  app.unmount();
});

test("a validation message appears, and the field says it is invalid", async () => {
  const form = newForm();
  const { container, app } = mountUnder(form, wiredField("owner.name"));
  const input = container.querySelector("input");

  typeInto(input, "Ad");
  await settle();

  const message = container.querySelectorAll("p")[1];
  assert.equal(message.getAttribute("role"), "alert");
  assert.notEqual(message.textContent, "");
  assert.equal(container.querySelector("input").getAttribute("aria-invalid"), "true");
  assert.equal(
    container.querySelector("input").getAttribute("aria-describedby"),
    `${container.querySelectorAll("p")[0].id} ${message.id}`,
    "the help line first and the message second, which is the order they are read in"
  );
  app.unmount();
});

test("a field that is waiting for its blur says nothing until it gets one", async () => {
  const form = newForm();
  const { container, app } = mountUnder(
    form,
    wiredField("owner.name", { showIssues: "touched" })
  );
  const input = container.querySelector("input");

  typeInto(input, "Ad");
  await settle();
  assert.equal(container.querySelectorAll("p")[1].textContent, "");

  blur(container.querySelector("input"));
  await settle();
  assert.notEqual(container.querySelectorAll("p")[1].textContent, "");
  app.unmount();
});

test("a submit is refused, and names what blocked it", async () => {
  const form = newForm({ owner: { name: "Ad", email: "not-an-email" } });
  const screen = {
    setup() {
      const status = useFormStatus();
      return () =>
        h("div", null, [
          h("span", { id: "errors" }, String(status.errorCount)),
          h("span", { id: "count" }, String(status.submitCount)),
        ]);
    },
  };
  const { container, app } = mountUnder(form, screen);

  let handlerRan = false;
  const outcome = await form.submit(() => {
    handlerRan = true;
  });

  assert.equal(outcome.submitted, false);
  assert.equal(handlerRan, false, "the handler must not see a root that blocks");
  assert.deepEqual(
    [...new Set(outcome.blockedBy.map((issue) => issue.path))].sort(),
    ["owner.email", "owner.name"],
    "the refusal names the paths, so a caller can say which boxes stopped it"
  );

  await settle();
  assert.equal(find(container, "errors").textContent, "2");
  assert.equal(find(container, "count").textContent, "1");
  app.unmount();
});

test("a refused submit reveals a field that was waiting for its blur", async () => {
  const form = newForm({ owner: { name: "Ad", email: "ada@example.com" } });
  const { container, app } = mountUnder(
    form,
    wiredField("owner.name", { showIssues: "touched" })
  );
  assert.equal(container.querySelectorAll("p")[1].textContent, "");

  await form.submit(() => undefined);
  await settle();

  assert.notEqual(
    container.querySelectorAll("p")[1].textContent,
    "",
    "pressing the button and being told nothing is the one outcome no policy may produce"
  );
  app.unmount();
});
