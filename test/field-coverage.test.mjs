// The other direction: a field the FORM has and the SCREEN does not.
//
// The sibling file, form-hooks.test.mjs, holds one half of this question — a
// component naming a path the form does not declare draws an inert input, and
// is warned about. This file holds the half that had no answer at all. A
// declared place nothing on the screen took is not a missing input: the cell
// exists, the default was seeded, the validator judges it, and a required one
// refuses every submit while the error summary names a control that is not on
// the page. The reader looks for the bug in the submit button.
//
// TWO WAYS TO BE MISSING, and they are asserted apart because they are fixed
// in different files. Nothing asked for the place — a component nobody wrote.
// Something asked and drew nothing — a widget registry with no entry for that
// kind, which is what an <AutoForm/> over an empty registry does for every
// field at once, and is the case where everything looks wired and the page is
// blank.
//
// WHAT IS NOT MISSING is the other half of the definition and is asserted just
// as hard: a subtree switched off, a row that does not exist, and a screen
// that says it draws part of the form. The value of the report is decided by
// its false positives, not by its true ones — a check that names the next
// wizard step every time gets turned off in a week.
//
// The schema here is local and tiny on purpose. What is under test is the
// relation between a set of declared places and a set of rendered components,
// so the schema is one operand of that relation and sharing it with a file
// asking a different question would make both harder to read.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountCatching } from "./support/warning-mount.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const {
  AutoForm,
  Field,
  FormProvider,
  useField,
  useUncontrolledField,
} = await import("@maroonedog/waypoint/react");

const { createElement: h } = React;

const APPLICANT = z.object({
  fullName: z.string().min(1).meta({ title: "Full name" }),
  email: z.email().meta({ title: "Email address" }),
});

const applicantForm = (options) =>
  createForm({
    adapter: zodFormResolver(APPLICANT),
    defaultValues: { fullName: "", email: "" },
    ...options,
  });

const ORDER = z.object({ items: z.array(z.object({ sku: z.string() })) });

const orderForm = () =>
  createForm({
    adapter: zodFormResolver(ORDER),
    defaultValues: { items: [{ sku: "a" }, { sku: "b" }] },
  });

/** One span per path, so a screen is written as a list of the paths it draws. */
const screenDrawing = (paths) =>
  function Screen() {
    return paths.map((path) => h(Row, { key: path, path }));
  };

function Row({ path }) {
  const field = useField(path);
  return h("span", null, String(field.value));
}

test("a screen that draws every declared place says nothing", async () => {
  const { root, escaped, warned } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm() },
      h(screenDrawing(["fullName", "email"]))
    )
  );
  assert.equal(escaped, null);
  assert.equal(warned, "", "every field was drawn");
  root.unmount();
});

test("a place nothing addressed is named, with the label it declared", async () => {
  const { root, escaped, warned } = await mountCatching(
    h(FormProvider, { form: applicantForm() }, h(screenDrawing(["fullName"])))
  );
  assert.equal(escaped, null, "a hole is reported, not thrown, by default");
  assert.match(warned, /nothing asked for: "email" \(Email address\)/);
  assert.doesNotMatch(warned, /fullName/, "the drawn field is not a finding");
  root.unmount();
});

test("a form that names itself quotes the missing place the way it is typed", async () => {
  const { root, warned } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm({ key: "applicant" }) },
      h(screenDrawing(["applicant:fullName"]))
    )
  );
  assert.match(warned, /"applicant:email"/);
  root.unmount();
});

test("a field asked for and never drawn is reported apart from one nobody asked for", async () => {
  // <AutoForm/> over the default registry: every field is addressed and none
  // is drawn, which is the shape worth telling apart — the components exist.
  const { container, root, warned } = await mountCatching(
    h(FormProvider, { form: applicantForm() }, h(AutoForm))
  );
  assert.equal(container.querySelectorAll("input").length, 0);
  assert.match(warned, /asked for, no widget: "fullName" \(Full name\)/);
  assert.doesNotMatch(warned, /nothing asked for/);
  root.unmount();
});

test("a place one component fails to draw and another draws is not missing", async () => {
  const widgets = { text: ({ field }) => h("input", field.inputProps) };
  const { root, warned } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm(), widgets },
      h(React.Fragment, null, h(Field, { path: "fullName", as: "absent" }), h(
        screenDrawing(["fullName", "email"])
      ))
    )
  );
  assert.doesNotMatch(warned, /fullName/);
  root.unmount();
});

test("a partial screen is not asked the question", async () => {
  const { root, warned } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm(), partial: true },
      h(screenDrawing(["fullName"]))
    )
  );
  assert.equal(warned, "");
  root.unmount();
});

test("a subtree switched off is not missing", async () => {
  const form = applicantForm();
  form.setParticipating("email", false);
  const { root, warned } = await mountCatching(
    h(FormProvider, { form }, h(screenDrawing(["fullName"])))
  );
  assert.equal(warned, "", "a dormant place is not one somebody forgot");
  root.unmount();
});

test("the rows that exist are places; the row that does not is not", async () => {
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: orderForm() }, h(screenDrawing(["items[0].sku"])))
  );
  assert.match(warned, /"items\[1\].sku"/);
  assert.doesNotMatch(warned, /items\[2\]/, "a row with no value is no place");
  root.unmount();
});

test("an uncontrolled binding counts as having taken the place", async () => {
  function Screen() {
    const name = useUncontrolledField("fullName");
    const email = useUncontrolledField("email");
    return h(React.Fragment, null, h("input", name.inputProps), h(
      "input",
      email.inputProps
    ));
  }
  const { root, warned } = await mountCatching(
    h(FormProvider, { form: applicantForm() }, h(Screen))
  );
  assert.equal(warned, "");
  root.unmount();
});

test('onFieldMismatch: "throw" turns the report into an error', async () => {
  const { escaped, warned } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm({ onFieldMismatch: "throw" }) },
      h(screenDrawing(["fullName"]))
    )
  );
  assert.ok(escaped instanceof Error, "the mount did not survive the hole");
  assert.match(escaped.message, /nothing asked for: "email"/);
  assert.equal(warned, "", "it is raised, not also printed");
});

test('onFieldMismatch: "throw" refuses a path the form does not declare too', async () => {
  const { escaped } = await mountCatching(
    h(
      FormProvider,
      { form: applicantForm({ onFieldMismatch: "throw" }), partial: true },
      h(screenDrawing(["emial"]))
    )
  );
  assert.ok(escaped instanceof Error);
  assert.match(escaped.message, /"emial" is not a field this form has/);
});

test("the report is made once, however often the provider mounts", async () => {
  const form = applicantForm();
  const screen = h(FormProvider, { form }, h(screenDrawing(["fullName"])));
  const first = await mountCatching(screen);
  first.root.unmount();
  const second = await mountCatching(screen);
  second.root.unmount();
  assert.match(first.warned, /nothing asked for/);
  assert.equal(second.warned, "", "a warning repeated is one nobody reads");
});

test("missing() is a plain query with no timing of its own", async () => {
  const form = applicantForm();
  assert.deepEqual(
    form.coverage.missing().map((one) => one.path),
    ["fullName", "email"],
    "before any component exists, nothing has been taken"
  );
  const { root } = await mountIntoDocument(
    h(
      FormProvider,
      { form, partial: true },
      h(screenDrawing(["fullName", "email"]))
    )
  );
  assert.deepEqual(form.coverage.missing(), []);
  root.unmount();
  assert.deepEqual(
    form.coverage.missing(),
    [],
    "unmounting does not un-write the component that drew it"
  );
});
