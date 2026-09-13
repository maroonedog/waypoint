// The application's wording, over the validator's.
//
// THE MATERIAL IS THE POINT. A wording function gets the issue and the
// descriptor, so it keys on `code` and interpolates the bound the schema
// declared — rather than matching the vendor's English, which is a table that
// breaks the day the vendor rewords. So the first test asserts on a sentence
// built from `constraints.minLength` and not on a string swap.
//
// AND `code` IS VENDOR-ONLY. `StandardSchemaV1.Issue` has `message` and `path`
// and nothing else, so the generic resolver carries none. That is asserted
// here rather than described, because it decides which resolver an application
// that wants its own wording has to install.
//
// ONE SCREEN, ONE SENTENCE is the other half: a field and the summary beside
// it read the same issue, so the wording reaches both or the screen contradicts
// itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument } from "./support/react-root.mjs";

const { z } = await import("zod");
const React = await import("react");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { standardFormResolver } = await import(
  "@maroonedog/waypoint/resolver-standard"
);
const { createForm } = await import("@maroonedog/waypoint/core");
const { FormProvider, useErrorSummary, useField, useFieldIssues } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h } = React;

const SCHEMA = z.object({
  name: z.string().min(3).meta({ title: "Name" }),
});

const build = (resolver = zodFormResolver) =>
  createForm({
    adapter: resolver(SCHEMA),
    defaultValues: { name: "" },
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

/** Keyed on the code, with the bound read off the descriptor. */
const inJapanese = (issue, descriptor) => {
  if (issue.code === "too_small" && descriptor?.kind === "string") {
    return `${descriptor.label ?? descriptor.path}は${
      descriptor.constraints?.minLength
    }文字以上で入力してください`;
  }
  return undefined;
};

const said = (container, id) => container.querySelector("#" + id).textContent;

const mountJudged = async (element, form) => {
  const mounted = await mountIntoDocument(element);
  await act(async () => {
    await form.validate();
    await settle();
  });
  return mounted;
};

test("the wording is built from the code and the declared bound", async () => {
  const form = build();
  function Screen() {
    const field = useField("name");
    return h("span", { id: "a" }, field.issues[0]?.message ?? "");
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor: inJapanese }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "Nameは3文字以上で入力してください");
  root.unmount();
});

test("undefined keeps what the validator said", async () => {
  const form = build();
  function Screen() {
    const field = useField("name");
    return h("span", { id: "a" }, field.issues[0]?.message ?? "");
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor: () => undefined }, h(Screen)),
    form
  );
  assert.match(said(container, "a"), /Too small/, "a miss blanks nothing");
  root.unmount();
});

test("the field and the summary say the same sentence", async () => {
  const form = build();
  function Screen() {
    const field = useField("name");
    const summary = useErrorSummary();
    const loose = useFieldIssues("name");
    return h(
      "div",
      null,
      h("span", { id: "field" }, field.issues[0]?.message ?? ""),
      h("span", { id: "summary" }, summary.entries[0]?.issues[0]?.message ?? ""),
      h("span", { id: "loose" }, loose[0]?.message ?? "")
    );
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor: inJapanese }, h(Screen)),
    form
  );
  const wanted = "Nameは3文字以上で入力してください";
  assert.equal(said(container, "field"), wanted);
  assert.equal(said(container, "summary"), wanted, "the summary too");
  assert.equal(said(container, "loose"), wanted, "and useFieldIssues");
  root.unmount();
});

test("the call overrides the provider", async () => {
  const form = build();
  function Screen() {
    const field = useField("name", { messageFor: () => "just this one" });
    return h("span", { id: "a" }, field.issues[0]?.message ?? "");
  }
  const { container, root } = await mountJudged(
    h(FormProvider, { form, messageFor: inJapanese }, h(Screen)),
    form
  );
  assert.equal(said(container, "a"), "just this one");
  root.unmount();
});

test("with no function set, the list is the very same array", async () => {
  const form = build();
  let seen = [];
  function Screen() {
    const field = useField("name");
    seen.push(field.issues);
    return h("span", { id: "a" }, field.issues[0]?.message ?? "");
  }
  const { root } = await mountJudged(h(FormProvider, { form }, h(Screen)), form);
  const last = seen.at(-1);
  assert.equal(
    last,
    form.field("name").sources.issues.read(),
    "no mapping, no allocation, and the identity a dependency array watches"
  );
  root.unmount();
});

test("code is carried by the vendor resolver and not by the generic one", async () => {
  const viaZod = await zodFormResolver(SCHEMA).validate({ name: "" });
  const viaSpec = await standardFormResolver(SCHEMA).validate({ name: "" });
  assert.equal(viaZod[0]?.code, "too_small");
  assert.equal(
    viaSpec[0]?.code,
    undefined,
    "the spec has no such member, so a wording table needs a vendor resolver"
  );
  assert.equal(viaZod[0]?.message, viaSpec[0]?.message, "the text is the same");
});
