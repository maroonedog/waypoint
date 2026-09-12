// The summary as a live hook on a rendered form: what it lists, and where it
// leaves the reader.
//
// `useErrorSummary` cannot be called without a tree to call it in, so
// everything here mounts. That is not a tax paid to reach the hook — it is
// what makes the central claim assertable at all. "The reader lands in the box
// that blocked the submit" is read off `document.activeElement`, never off the
// binding, because a binding reporting that it moved focus and a document
// whose focus moved are different facts, and only the second is the promise
// being made to somebody holding a keyboard.
//
// The tests that assert a NEGATIVE are the ones that need a real document
// most. A row for a field nothing draws has to report that it has nowhere to
// go, and `focusFirst` has to walk past it to a field that does exist. "There
// is no element" must be the document's answer; against a stub it is whatever
// the stub was written to say, which is the answer being assumed rather than
// found.
//
// Two forms are mounted on one page in the scoping test on purpose: each of
// them has a field called `name`, which is the exact collision
// field-element-ids.ts scopes ids against, met again from the other side.
//
// The order the entries come out in is settled without any of this, in
// error-summary.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "./support/dom.mjs";
import { mountIntoDocument as mount } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useErrorSummary, useField } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h } = React;

const REGISTRATION = z.object({
  name: z.string().min(1).meta({ title: "Full name" }),
  email: z.string().min(1).meta({ title: "Email address" }),
});

const registrationForm = () =>
  createForm({
    adapter: zodFormResolver(REGISTRATION),
    defaultValues: { name: "", email: "" },
  });

function Input({ path }) {
  const field = useField(path);
  return h("input", { ...field.inputProps });
}

/** A form, its summary, and a submit that focuses on refusal. */
function Screen({ form, onRefused }) {
  const summary = useErrorSummary();
  return h(
    "form",
    {
      noValidate: true,
      ...summary.scopeProps,
      onSubmit: async (event) => {
        event.preventDefault();
        const outcome = await form.submit(() => {});
        if (!outcome.submitted) onRefused(summary);
      },
    },
    summary.entries.length === 0
      ? null
      : h(
          "div",
          { ...summary.summaryProps, id: "summary" },
          h("h2", null, "There is a problem"),
          h(
            "ul",
            null,
            summary.entries.map((entry) =>
              h(
                "li",
                { key: entry.path },
                h(
                  "button",
                  { type: "button", onClick: entry.focus },
                  `${entry.label ?? entry.path}: ${entry.message}`
                )
              )
            )
          )
        ),
    h(Input, { path: "name" }),
    h(Input, { path: "email" }),
    h("button", { type: "submit", id: "send" }, "Send")
  );
}

test("a refused submit puts focus in the first field that blocked", async () => {
  const form = registrationForm();
  let summary = null;
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Screen, { form, onRefused: (s) => (summary = s) }))
  );

  await act(async () => {
    container.querySelector("#send").click();
  });

  assert.ok(summary !== null, "the submit was refused");
  assert.equal(
    summary.focusFirst(),
    true,
    "focusFirst is called before React has re-rendered and still finds it"
  );
  assert.equal(dom.window.document.activeElement.getAttribute("name"), "name");
  root.unmount();
  container.remove();
});

test("the summary lists both fields, labelled, in declaration order", async () => {
  const form = registrationForm();
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Screen, { form, onRefused: () => {} }))
  );
  await act(async () => {
    container.querySelector("#send").click();
  });

  const shown = [...container.querySelectorAll("#summary button")].map(
    (button) => button.textContent
  );
  assert.equal(shown.length, 2);
  assert.match(shown[0], /^Full name: /);
  assert.match(shown[1], /^Email address: /);
  root.unmount();
  container.remove();
});

test("an entry's button moves focus to that entry's field", async () => {
  const form = registrationForm();
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Screen, { form, onRefused: () => {} }))
  );
  await act(async () => {
    container.querySelector("#send").click();
  });

  await act(async () => {
    container.querySelectorAll("#summary button")[1].click();
  });
  assert.equal(dom.window.document.activeElement.getAttribute("name"), "email");
  root.unmount();
  container.remove();
});

test("the summary region is focusable by script and out of the tab order", async () => {
  const form = registrationForm();
  let summary = null;
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Screen, { form, onRefused: (s) => (summary = s) }))
  );
  await act(async () => {
    container.querySelector("#send").click();
  });

  const region = container.querySelector("#summary");
  assert.equal(region.getAttribute("tabindex"), "-1");
  assert.equal(region.hasAttribute("role"), false, "no role, deliberately");
  assert.equal(summary.focusSummary(), true);
  assert.equal(dom.window.document.activeElement, region);
  root.unmount();
  container.remove();
});

test("two forms on one page focus their OWN field of the same name", async () => {
  // Both forms have a field called `name`. Without the scope ref the second
  // form's summary would send its reader into the first form.
  const first = registrationForm();
  const second = registrationForm();
  let secondSummary = null;
  const { container, root } = await mount(
    h(
      "div",
      null,
      h(FormProvider, { form: first, formKey: "first" }, h(Screen, { form: first, onRefused: () => {} })),
      h(
        FormProvider,
        { form: second, formKey: "second" },
        h(Screen, { form: second, onRefused: (s) => (secondSummary = s) })
      )
    )
  );

  const sends = container.querySelectorAll("#send");
  await act(async () => sends[1].click());
  assert.ok(secondSummary !== null);
  assert.equal(secondSummary.focusFirst(), true);

  const forms = container.querySelectorAll("form");
  const focused = dom.window.document.activeElement;
  assert.equal(focused.getAttribute("name"), "name");
  assert.equal(forms[1].contains(focused), true, "the SECOND form's field");
  assert.equal(forms[0].contains(focused), false);
  root.unmount();
  container.remove();
});

test("an adopted issue is listed and reports that it has nowhere to go", async () => {
  const form = createForm({
    adapter: zodFormResolver(REGISTRATION),
    defaultValues: { name: "Ada", email: "ada@example.com" },
  });
  let summary = null;
  function Watcher() {
    summary = useErrorSummary();
    return null;
  }
  const { container, root } = await mount(
    h(
      FormProvider,
      { form },
      h("form", null, h(Input, { path: "name" }), h(Watcher))
    )
  );

  await act(async () => {
    form.adoptIssues([{ path: "payment", message: "The card was declined." }]);
  });

  assert.deepEqual(
    summary.entries.map((entry) => entry.path),
    ["payment"]
  );
  assert.equal(summary.entries[0].label, undefined);
  assert.equal(
    summary.entries[0].focus(),
    false,
    "nothing draws `payment`, and saying so is the point"
  );
  assert.equal(
    summary.focusFirst(),
    false,
    "there is no drawn field to fall through to either"
  );
  root.unmount();
  container.remove();
});

test("focusFirst walks past a blocked path nothing draws", async () => {
  // `payment` is declared, blocked and deliberately not rendered. Focus has to
  // reach `name` rather than stopping at the row with nowhere to go — which is
  // what `entries[0].focus()` on its own would have done.
  const undrawnFirst = {
    fields: [
      { path: "payment", kind: "string", isRequired: false, constraints: {} },
      { path: "name", kind: "string", isRequired: false, constraints: {} },
    ],
    validate: () => [
      { path: "payment", message: "The card was declined." },
      { path: "name", message: "Enter your full name." },
    ],
  };
  const form = createForm({
    adapter: undrawnFirst,
    defaultValues: { payment: "", name: "" },
  });
  let summary = null;
  function Screen() {
    summary = useErrorSummary();
    return h("form", { ...summary.scopeProps }, h(Input, { path: "name" }));
  }
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Screen))
  );
  await act(async () => {
    await form.validate();
  });

  assert.deepEqual(
    summary.entries.map((entry) => entry.path),
    ["payment", "name"],
    "both are listed; the undrawn one is not hidden"
  );
  assert.equal(summary.entries[0].focus(), false);
  assert.equal(summary.focusFirst(), true);
  assert.equal(dom.window.document.activeElement.getAttribute("name"), "name");
  root.unmount();
  container.remove();
});

test("a warning is not in the summary, because it does not block", async () => {
  const warned = {
    fields: [
      { path: "nickname", kind: "string", isRequired: false, constraints: {} },
    ],
    validate: () => [
      { path: "nickname", message: "unusual", severity: "warning" },
    ],
  };
  const form = createForm({ adapter: warned, defaultValues: { nickname: "x" } });
  let summary = null;
  function Watcher() {
    summary = useErrorSummary();
    return null;
  }
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Watcher))
  );
  await act(async () => {
    await form.validate();
  });
  assert.deepEqual(summary.entries, []);
  root.unmount();
  container.remove();
});
