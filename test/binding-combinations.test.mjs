// The axes meeting each other, and the edges each of them has on its own.
//
// Four things were added to the binding in one stretch — the coverage report,
// `showIssues`, `messageFor` and `decorate` — and each arrived with tests for
// itself. What none of them tested is the claim they were all argued from:
// that they are INDEPENDENT. A gate that also changed the wording, or a
// wording function that also decided visibility, would pass every file in this
// directory and be wrong on the first screen that used two of them.
//
// The rest is the edges. A decorator that is handed something that is not an
// element, a wording function that returns an empty string, a server issue at
// a path no descriptor declares — each is a case the prose claims an answer
// for, and a claim in prose is the kind this repository keeps finding to be
// false.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useErrorSummary, useField, useUncontrolledField } =
  await import("@maroonedog/waypoint/react");

const { act, createElement: h } = React;

const SCHEMA = z.object({
  name: z
    .string()
    .min(3, "at least 3")
    .meta({ title: "Name", description: "As it appears on the card" }),
  items: z.array(z.object({ sku: z.string().min(2, "at least 2") })),
});

const build = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: { name: "", items: [{ sku: "" }, { sku: "ok" }] },
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const mountJudged = async (element, form) => {
  const mounted = await mountIntoDocument(element);
  await act(async () => {
    await form.validate();
    await settle();
  });
  return mounted;
};
const said = (container, id) => container.querySelector("#" + id).textContent;
const probe = (container, name) =>
  container.querySelector(`[data-probe="${name}"]`);

const OURS = (issue) =>
  issue.code === "too_small" ? "ours: too short" : undefined;

// ---------------------------------------------------------------------------
// The axes, meeting.

test("a quiet field is quiet, and speaks the application's sentence when it speaks", async () => {
  const form = build();
  function Screen() {
    const field = useField("name", { showIssues: "touched", messageFor: OURS });
    return h("span", { id: "a" }, field.issues[0]?.message ?? "");
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, partial: true }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "", "the gate is not the wording");
  await act(async () => form.field("name").markTouched());
  assert.equal(said(container, "a"), "ours: too short", "and then both apply");
  root.unmount();
});

test("a decorated input's aria-invalid follows the gate, not the verdict", async () => {
  const form = build();
  function Screen() {
    const field = useField("name", { showIssues: "touched" });
    return field.decorate(h("input", { "data-probe": "name" }));
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, partial: true }, h(Screen)),
    form
  );
  assert.equal(form.errorCount.read() > 0, true, "the form is blocked");
  assert.equal(
    probe(container, "name").getAttribute("aria-invalid"),
    null,
    "and the input this reader is looking at says nothing yet"
  );
  await act(async () => form.field("name").markTouched());
  assert.equal(probe(container, "name").getAttribute("aria-invalid"), "true");
  root.unmount();
});

test("the wording reaches a server's issue, which has no descriptor to read", async () => {
  const form = build();
  const seen = [];
  function Screen() {
    const summary = useErrorSummary();
    return h(
      "span",
      { id: "a" },
      summary.entries.map((entry) => entry.issues[0]?.message).join(" | ")
    );
  }
  const messageFor = (issue, descriptor) => {
    seen.push([issue.path, descriptor === undefined]);
    return issue.code === "declined" ? "ours: card declined" : undefined;
  };
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor, partial: true }, h(Screen)),
    form
  );
  await act(async () => {
    form.adoptIssues([
      { path: "payment", message: "declined", code: "declined" },
    ]);
    await settle();
  });
  assert.match(said(container, "a"), /ours: card declined/);
  assert.deepEqual(
    seen.find(([path]) => path === "payment"),
    ["payment", true],
    "a path no descriptor declares hands the function undefined, as documented"
  );
  root.unmount();
});

test("each row gates on its own blur", async () => {
  const form = build();
  function Row({ at }) {
    const field = useField(at, { showIssues: "touched" });
    // Not an id: a path carries brackets and dots, and a selector built from
    // one is a compiled string the document refuses. See testid-lookup.mjs.
    return h("span", { "data-probe": at }, field.issues[0]?.message ?? "");
  }
  function Screen() {
    return h(
      "div",
      null,
      h(Row, { at: "items[0].sku" }),
      h(Row, { at: "items[1].sku" })
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, partial: true }, h(Screen)),
    form
  );
  assert.equal(probe(container, "items[0].sku").textContent, "");
  await act(async () => form.field("items[0].sku").markTouched());
  assert.equal(probe(container, "items[0].sku").textContent, "at least 2");
  assert.equal(
    probe(container, "items[1].sku").textContent,
    "",
    "the other row is its own"
  );
  root.unmount();
});

test("an adopted issue on an undeclared path is not a coverage finding", async () => {
  const form = build();
  form.adoptIssues([{ path: "payment", message: "declined" }]);
  assert.deepEqual(
    form.coverage.missing().map((one) => one.path),
    ["name", "items[0].sku", "items[1].sku"],
    "coverage asks what the SCHEMA declared, not what is currently wrong"
  );
});

// ---------------------------------------------------------------------------
// The edges.

test("both onBlur handlers run, not only ours", async () => {
  const form = build();
  const seen = [];
  function Screen() {
    const field = useField("name");
    return field.decorate(
      h("input", { "data-probe": "name", onBlur: () => seen.push("theirs") })
    );
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form, partial: true }, h(Screen))
  );
  await act(async () => {
    probe(container, "name").dispatchEvent(
      new container.ownerDocument.defaultView.FocusEvent("focusout", {
        bubbles: true,
      })
    );
  });
  assert.deepEqual(seen, ["theirs"]);
  assert.equal(
    form.field("name").sources.touched.read(),
    true,
    "and ours marked it touched"
  );
  root.unmount();
});

test("a decorator handed something that is not an element gives it back", async () => {
  const form = build();
  let returned;
  function Screen() {
    const field = useField("name");
    returned = field.decorate(null);
    return h("span", { id: "a" }, "drawn");
  }
  const { root } = await mountIntoDocument(
    h(FormProvider, { form, partial: true }, h(Screen))
  );
  assert.equal(returned, null, "no throw, and nothing invented");
  root.unmount();
});

test("the description bag goes on when the schema declared one", async () => {
  const form = build();
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      field.decorate(h("input", { "data-probe": "name" })),
      field.decorate(h("p", { "data-probe": "help" }, "hint"), "description")
    );
  }
  const { container, root } = await mountIntoDocument(
    h(FormProvider, { form, partial: true }, h(Screen))
  );
  const describedBy = probe(container, "name")
    .getAttribute("aria-describedby")
    .split(" ");
  assert.ok(
    describedBy.includes(probe(container, "help").getAttribute("id")),
    "the input points at the element the decorator gave an id to"
  );
  root.unmount();
});

test("an empty sentence keeps the validator's rather than blanking the error", async () => {
  const form = build();
  function Screen() {
    const field = useField("name");
    return h(
      "div",
      null,
      h("span", { id: "a" }, field.issues[0]?.message ?? ""),
      field.decorate(h("input", { "data-probe": "name" }))
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor: () => "", partial: true }, h(Screen)),
    form
  );
  assert.equal(
    said(container, "a"),
    "at least 3",
    "an empty string is not a message: aria-invalid with nothing to read is the failure this avoids"
  );
  assert.equal(probe(container, "name").getAttribute("aria-invalid"), "true");
  root.unmount();
});

test("the uncontrolled binding takes the same two options", async () => {
  const form = build();
  function Screen() {
    const field = useUncontrolledField("name", {
      showIssues: "touched",
      messageFor: OURS,
    });
    return h(
      "div",
      null,
      h("span", { id: "a" }, field.issues[0]?.message ?? ""),
      field.decorate(h("input", { "data-probe": "name" }))
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, partial: true }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "");
  await act(async () => form.field("name").markTouched());
  assert.equal(said(container, "a"), "ours: too short");
  root.unmount();
});
