// The error summary, and the two halves it is made of.
//
// The half that can be tested without a document is the ORDER: a summary that
// lists fields in the order the validator happened to walk the schema is the
// defect this exists to fix, and `summarizeIssues` is where the fix lives. The
// row cases are the ones a flat sort key gets wrong, so they are the ones with
// the most tests.
//
// The half that needs a document is FOCUS. It is asserted through
// `document.activeElement` on a real render rather than by inspecting the
// binding, because "the reader ends up in the right box" is the only claim
// worth making and the only one an auditor will make themselves.
//
// Two forms are mounted on one page in the scoping test on purpose: every
// input in both of them is called `name`, which is the exact collision
// field-element-ids.ts scopes ids against, met again from the other side.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // A navigator already provided by the host is fine.
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { buildDescriptorTree, createForm, summarizeIssues } = await import(
  "@maroonedog/waypoint/core"
);
const { FormProvider, useErrorSummary, useField } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h } = React;

// ---------------------------------------------------------------------------
// The order, with no document in sight.
// ---------------------------------------------------------------------------

const leaf = (path, label) => ({
  path,
  kind: "string",
  isRequired: false,
  constraints: {},
  ...(label === undefined ? {} : { label }),
});

const complaint = (path, message) => ({ path, message });

const orderOf = (descriptors, issues) =>
  summarizeIssues({ tree: buildDescriptorTree(descriptors), issues }).map(
    (entry) => entry.path
  );

test("entries follow declaration order, not the order the issues arrived", () => {
  const descriptors = [
    leaf("name"),
    leaf("email"),
    leaf("postcode"),
  ];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("postcode", "c"),
      complaint("name", "a"),
      complaint("email", "b"),
    ]),
    ["name", "email", "postcode"]
  );
});

test("a row's fields stay together instead of every row's first field first", () => {
  // The case a flat (declaration slot, indices) key gets wrong: `sku` is slot
  // 0 and `quantity` is slot 1, so sorting on the slot first would produce
  // items[0].sku, items[1].sku, items[0].quantity — which is not what anybody
  // reading down the page meets.
  const descriptors = [leaf("items[*].sku"), leaf("items[*].quantity")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("items[1].quantity", "d"),
      complaint("items[0].quantity", "b"),
      complaint("items[1].sku", "c"),
      complaint("items[0].sku", "a"),
    ]),
    ["items[0].sku", "items[0].quantity", "items[1].sku", "items[1].quantity"]
  );
});

test("a nested row interleaves at both depths", () => {
  const descriptors = [leaf("orders[*].id"), leaf("orders[*].lines[*].sku")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("orders[1].lines[0].sku", "e"),
      complaint("orders[0].lines[1].sku", "c"),
      complaint("orders[1].id", "d"),
      complaint("orders[0].lines[0].sku", "b"),
      complaint("orders[0].id", "a"),
    ]),
    [
      "orders[0].id",
      "orders[0].lines[0].sku",
      "orders[0].lines[1].sku",
      "orders[1].id",
      "orders[1].lines[0].sku",
    ]
  );
});

test("an issue on the array itself sorts above the rows it contains", () => {
  const descriptors = [leaf("name"), leaf("items[*].sku")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("items[0].sku", "b"),
      complaint("items", "at least one"),
      complaint("name", "a"),
    ]),
    ["name", "items", "items[0].sku"]
  );
});

test("a path the tree cannot place goes last, in the order it arrived", () => {
  const descriptors = [leaf("name")];
  assert.deepEqual(
    orderOf(descriptors, [
      complaint("payment", "the card was declined"),
      complaint("account", "already taken"),
      complaint("name", "required"),
    ]),
    ["name", "payment", "account"]
  );
});

test("one field with three complaints is one entry carrying all three", () => {
  const entries = summarizeIssues({
    tree: buildDescriptorTree([leaf("password", "Password")]),
    issues: [
      complaint("password", "too short"),
      complaint("password", "needs a digit"),
      complaint("password", "needs a symbol"),
    ],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].label, "Password");
  assert.equal(entries[0].message, "too short", "the first one is the line");
  assert.equal(entries[0].issues.length, 3);
});

test("no label is invented for a field whose schema declared none", () => {
  const entries = summarizeIssues({
    tree: buildDescriptorTree([leaf("owner.name")]),
    issues: [complaint("owner.name", "required")],
  });
  assert.equal(entries[0].label, undefined, "not `Owner name`, not the path");
  assert.equal(entries[0].path, "owner.name");
});

// ---------------------------------------------------------------------------
// The focus, on a rendered form.
// ---------------------------------------------------------------------------

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

async function mount(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
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
  // Every input in both forms is called `name`. Without the scope ref the
  // second form's summary would send its reader into the first form.
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
