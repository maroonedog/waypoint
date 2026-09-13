// When a field starts saying what the pass already knows.
//
// THE DEFECT THIS EXISTS FOR is the first test. `validateOn` decides when a
// PASS RUNS, and a pass judges the whole root and writes every path it named —
// so under `"blur"`, blurring `a` published `b`'s verdict, and a field the
// reader had never reached was marked `aria-invalid` because a different one
// lost focus. That test is written against the runtime rather than against the
// binding, so it keeps describing the runtime's behaviour whatever the
// bindings do about it.
//
// EVERYTHING ELSE HERE IS ABOUT DISPLAY, and the line between the two is the
// point: `errorCount` and `blockedBy` are asserted to be unmoved by every one
// of these settings. A field that is not speaking still refuses the submit,
// and a policy that changed that would be a form that submits invalid values
// because nobody was looking.
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
  a: z.string().min(3, "a needs 3"),
  b: z.string().min(3, "b needs 3"),
});

const build = (validateOn) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: { a: "", b: "" },
    ...(validateOn === undefined ? {} : { validateOn }),
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

/** One span per field carrying what that binding is willing to say. */
const screenOf = (options) =>
  function Screen() {
    const a = useField("a", options);
    const b = useField("b", options);
    return h(
      "div",
      null,
      h("span", { id: "a" }, a.issues[0]?.message ?? ""),
      h("span", { id: "b" }, b.issues[0]?.message ?? ""),
      h("input", { ...a.inputProps, "data-probe": "a-input" }),
      h("input", { ...b.inputProps, "data-probe": "b-input" })
    );
  };

const said = (container, id) => container.querySelector("#" + id).textContent;
const invalid = (container, probe) =>
  container
    .querySelector('[data-probe="' + probe + '"]')
    .getAttribute("aria-invalid");

/**
 * Mounts, then asks for one pass and lets it land.
 *
 * NOTHING IS JUDGED AT `createForm` and nothing is judged by mounting: the
 * cells are seeded from the descriptors and the first verdict arrives when
 * something asks for one. So a test that mounted and read the screen would be
 * reading the moment before its own subject exists, and every assertion in it
 * would pass for the wrong reason.
 */
const mountJudged = async (element, form) => {
  const mounted = await mountIntoDocument(element);
  await act(async () => {
    await form.validate();
    await settle();
  });
  return mounted;
};

test("a pass publishes every path it judged, whatever moment asked for it", async () => {
  // The runtime's behaviour, and the reason the display axis had to exist.
  const form = build("blur");
  await settle();
  form.field("a").markTouched();
  await settle();
  assert.equal(form.field("a").sources.issues.read().length, 1);
  assert.equal(
    form.field("b").sources.issues.read().length,
    1,
    "blurring a judged the whole root, so b carries its verdict too"
  );
  assert.equal(form.field("b").sources.touched.read(), false);
});

test("by default a field says it immediately, which is what it always did", async () => {
  const form = build();
  const { container, root } = await mountJudged(
    h(FormProvider, { form }, h(screenOf(undefined))),
    form
  );
  assert.equal(said(container, "a"), "a needs 3");
  assert.equal(said(container, "b"), "b needs 3");
  root.unmount();
});

test('"touched" keeps a field quiet until its own first blur', async () => {
  const form = build();
  const { container, root } = await mountJudged(
    h(FormProvider, { form }, h(screenOf({ showIssues: "touched" }))),
    form
  );
  assert.equal(said(container, "a"), "");
  assert.equal(said(container, "b"), "");
  assert.equal(invalid(container, "a-input"), null, "and no aria-invalid");

  await act(async () => form.field("a").markTouched());
  assert.equal(said(container, "a"), "a needs 3");
  assert.equal(said(container, "b"), "", "b was not the field that was left");
  assert.equal(invalid(container, "a-input"), "true");
  assert.equal(invalid(container, "b-input"), null);
  root.unmount();
});

test('"dirty" waits for an edit rather than for a blur', async () => {
  const form = build();
  const { container, root } = await mountJudged(
    h(FormProvider, { form }, h(screenOf({ showIssues: "dirty" }))),
    form
  );
  await act(async () => form.field("a").markTouched());
  assert.equal(said(container, "a"), "", "blurring is not editing");
  await act(async () => form.field("a").setValue("x"));
  assert.equal(said(container, "a"), "a needs 3");
  assert.equal(said(container, "b"), "");
  root.unmount();
});

test("the count and the submit verdict are untouched by any of it", async () => {
  const form = build();
  const { container, root } = await mountJudged(
    h(FormProvider, { form }, h(screenOf({ showIssues: "touched" }))),
    form
  );
  await settle();
  assert.equal(said(container, "a"), "", "nothing is on screen");
  assert.equal(form.errorCount.read(), 2, "and both still block");
  assert.deepEqual(
    form.blockedBy.read().map((issue) => issue.path),
    ["a", "b"]
  );
  const outcome = await act(async () => form.submit(() => undefined));
  assert.equal(outcome.submitted, false);
  assert.equal(outcome.blockedBy.length, 2);
  root.unmount();
});

test("a refused submit reveals every field, whatever it asked for", async () => {
  const form = build();
  const { container, root } = await mountJudged(
    h(FormProvider, { form }, h(screenOf({ showIssues: "touched" }))),
    form
  );
  assert.equal(said(container, "a"), "");
  await act(async () => {
    await form.submit(() => undefined);
  });
  assert.equal(said(container, "a"), "a needs 3");
  assert.equal(said(container, "b"), "b needs 3");
  root.unmount();
});

test("the provider sets the default and the call overrides it", async () => {
  const form = build();
  function Screen() {
    const quiet = useField("a");
    const loud = useField("b", { showIssues: "immediately" });
    return h(
      "div",
      null,
      h("span", { id: "a" }, quiet.issues[0]?.message ?? ""),
      h("span", { id: "b" }, loud.issues[0]?.message ?? "")
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, showIssues: "touched" }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "", "inherited from the provider");
  assert.equal(said(container, "b"), "b needs 3", "overridden at the call");
  root.unmount();
});

test("the uncontrolled binding answers the same way", async () => {
  const form = build();
  function Screen() {
    const a = useUncontrolledField("a", { showIssues: "touched" });
    return h(
      "div",
      null,
      h("span", { id: "a" }, a.issues[0]?.message ?? ""),
      h("input", { ...a.inputProps, "data-probe": "a-input" })
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, partial: true }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "");
  assert.equal(invalid(container, "a-input"), null);
  await act(async () => form.field("a").markTouched());
  assert.equal(said(container, "a"), "a needs 3");
  assert.equal(invalid(container, "a-input"), "true");
  root.unmount();
});
