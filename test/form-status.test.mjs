// The number that decides whether a submit goes through, and the one way to
// take a subtree out of it.
//
// PARTICIPATION IS ONLY VISIBLE AS A COUNT, which is why these two tests are
// one file and not two. "Switched off" is not a state a caller can read off a
// field: nothing on the subtree changes, no mark is rendered, and the values
// are all still there. The only observable is that `errorCount` stops
// including what the subtree holds — so the first test has to establish what
// that number actually counts before the second one can mean anything by
// watching it fall and come back.
//
// WHY THE PATH AND NOT A WRAPPER. Participation used to be a prop on a scope
// component, which meant switching a subtree off also rewrote every path
// inside it — two unrelated powers wearing one component, with no way to ask
// for the second without the first. It is addressed by a path now. That is
// why the second test re-renders the same tree with the flag flipped instead
// of unmounting anything: a subtree that had to leave the screen to stop
// blocking would be a different feature, and one no form wants.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { mountIntoDocument as mount } from "./support/react-root.mjs";
import { newForm, GOOD } from "./support/owner-form.mjs";
import { find } from "./support/testid-lookup.mjs";

const React = await import("react");
const { FormProvider, useParticipation, useFormStatus } = await import(
  "@maroonedog/waypoint/react"
);

const { act, createElement: h, Fragment } = React;

test("the status reflects what blocks and how often it was tried", async () => {
  const form = newForm({ ...GOOD, owner: { name: "A", email: "nope" } });
  const Status = () => {
    const status = useFormStatus();
    return h(
      "span",
      { "data-testid": "status" },
      status.errorCount + "/" + status.submitCount
    );
  };
  const { container, root } = await mount(
    h(FormProvider, { form }, h(Status, null))
  );

  await act(async () => {
    form.validate();
  });
  assert.equal(find(container, "status").textContent, "2/0");

  await act(async () => {
    await form.submit(() => undefined);
  });
  assert.equal(find(container, "status").textContent, "2/1");
  await act(async () => root.unmount());
});

const Dormancy = ({ form, path, participating }) => {
  useParticipation(form, path, participating);
  return null;
};

test("a subtree switched off stops blocking while it is mounted", async () => {
  const form = newForm({ ...GOOD, owner: { name: "A", email: "nope" } });
  const Status = () => {
    const status = useFormStatus();
    return h("span", { "data-testid": "status" }, String(status.errorCount));
  };
  const Screen = ({ dormant }) =>
    h(
      FormProvider,
      { form },
      h(
        Fragment,
        null,
        h(Status, null),
        h(Dormancy, { form, path: "owner", participating: !dormant })
      )
    );

  const { container, root } = await mount(h(Screen, { dormant: false }));
  await act(async () => {
    form.validate();
  });
  assert.equal(find(container, "status").textContent, "2");

  await act(async () => root.render(h(Screen, { dormant: true })));
  await act(async () => undefined);
  assert.equal(find(container, "status").textContent, "0");

  await act(async () => root.render(h(Screen, { dormant: false })));
  await act(async () => undefined);
  assert.equal(find(container, "status").textContent, "2");
  await act(async () => root.unmount());
});
