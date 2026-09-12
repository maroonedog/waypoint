// Rows on screen: what a list re-renders, and what it does not.
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
const { zodFormResolver } = await import("@maroonedog/form-contract/resolver-zod");
const { createForm } = await import("@maroonedog/form-contract/core");
const { FormProvider, Field, FieldRows, useParticipation } = await import(
  "@maroonedog/form-contract/react"
);

const { act, createElement: h, Fragment } = React;

const SCHEMA = z.object({
  items: z.array(
    z.object({ sku: z.string().min(1), quantity: z.number().min(1) })
  ),
});

const DEFAULTS = {
  items: [
    { sku: "a", quantity: 1 },
    { sku: "b", quantity: 2 },
    { sku: "c", quantity: 3 },
  ],
};

function makeScreen(form, counters) {
  // One counter per row KEY, so a row that survives a splice is followed by
  // its id rather than by the slot it happens to sit in. The count is taken
  // inside the children function, which is where the subscription lives: the
  // wrapper around it reads nothing and is not expected to move.
  const Row = ({ rowKey, at }) => {
    counters.wrappers[rowKey] = (counters.wrappers[rowKey] ?? 0) + 1;
    return h(Field, { path: `${at}.sku` }, (field) => {
      counters.rows[rowKey] = (counters.rows[rowKey] ?? 0) + 1;
      return h("input", {
        ...field.inputProps,
        "data-testid": "sku-" + rowKey,
      });
    });
  };

  return function Screen() {
    counters.shell += 1;
    return h(
      FormProvider,
      { form },
      h(FieldRows, { path: "items" }, ({ rows, insert, remove, move }) => {
        counters.list += 1;
        return h(
          Fragment,
          null,
          rows.map((row) =>
            h(Row, { key: row.key, rowKey: row.key, at: row.path })
          ),
          h("button", {
            "data-testid": "add",
            onClick: () => insert(rows.length, { sku: "new", quantity: 1 }),
          }),
          h("button", {
            "data-testid": "remove-first",
            onClick: () => remove(0),
          }),
          h("button", {
            "data-testid": "move-first-last",
            onClick: () => move(0, rows.length - 1),
          })
        );
      })
    );
  };
}

const find = (container, testId) =>
  container.querySelector("[data-testid=" + JSON.stringify(testId) + "]");

async function type(container, testId, value) {
  const element = find(container, testId);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

async function render() {
  const counters = { shell: 0, list: 0, rows: {}, wrappers: {} };
  const form = createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });
  const Screen = makeScreen(form, counters);
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(h(Screen)));
  return { form, counters, container, root };
}

test("a list renders one row per id, bound to its own index", async () => {
  const { container, root } = await render();
  assert.equal(find(container, "sku-r0").value, "a");
  assert.equal(find(container, "sku-r1").value, "b");
  assert.equal(find(container, "sku-r2").value, "c");
  await act(async () => root.unmount());
});

test("editing one row re-renders neither the list nor the other rows", async () => {
  const { counters, container, root } = await render();
  const before = {
    list: counters.list,
    rows: { ...counters.rows },
    wrappers: { ...counters.wrappers },
  };

  await type(container, "sku-r1", "bb");

  assert.equal(counters.rows.r1, before.rows.r1 + 1, "the edited field");
  assert.equal(counters.rows.r0, before.rows.r0, "the row above stood still");
  assert.equal(counters.rows.r2, before.rows.r2, "the row below stood still");
  assert.equal(counters.list, before.list, "the list stood still");
  assert.equal(counters.shell, 1, "the shell stood still");
  // The subscription is inside the children function, so even the component
  // that wraps the edited field does not move.
  assert.deepEqual(counters.wrappers, before.wrappers, "no wrapper moved");
  await act(async () => root.unmount());
});

test("adding a row does not disturb the values already on screen", async () => {
  const { container, root } = await render();
  await type(container, "sku-r0", "aa");
  await act(async () => find(container, "add").click());

  assert.equal(find(container, "sku-r0").value, "aa");
  assert.equal(find(container, "sku-r1").value, "b");
  assert.equal(find(container, "sku-r3").value, "new");
  await act(async () => root.unmount());
});

// React keeps a row by its key while the cell underneath is keyed by index, so
// a removal from the top moves every following row onto a different cell.
// Two mechanisms make this come out right — the splice moves the cells, and a
// value cell is re-derived from the root when it is subscribed — and this test
// is satisfied by either. What the splice alone is responsible for is pinned in
// test/rows.test.mjs, where nothing is mounted to re-subscribe.
test("removing the first row leaves every survivor showing its own value", async () => {
  const { container, root } = await render();
  await type(container, "sku-r1", "bb");
  await type(container, "sku-r2", "cc");

  await act(async () => find(container, "remove-first").click());

  assert.equal(find(container, "sku-r0"), null, "the removed row is gone");
  assert.equal(find(container, "sku-r1").value, "bb");
  assert.equal(find(container, "sku-r2").value, "cc");
  await act(async () => root.unmount());
});

test("moving a row takes its value with it", async () => {
  const { form, container, root } = await render();
  await type(container, "sku-r0", "aa");

  await act(async () => find(container, "move-first-last").click());

  assert.deepEqual(
    form.readRoot().items.map((row) => row.sku),
    ["b", "c", "aa"]
  );
  assert.equal(find(container, "sku-r0").value, "aa", "the row kept its id");
  await act(async () => root.unmount());
});

test("a rule used where a place is needed fails loudly", async () => {
  const form = createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });
  const Bare = () =>
    h(FormProvider, { form }, h(Field, { path: "items[*].sku" }, () => null));
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  await assert.rejects(
    async () => {
      await act(async () => root.render(h(Bare)));
    },
    (error) =>
      /is a rule, not a place/.test(error.message) &&
      /useFieldValues/.test(error.message)
  );
});

// Participation is addressed like everything else now: a path, not a wrapper.
// The defect this keeps closed is that a row must be silenceable by its own
// address rather than by whatever scope happened to enclose it.
test("a row can be switched off without being removed", async () => {
  const { z } = await import("zod");
  const { createForm, errorCountCell } = await import("@maroonedog/form-contract/core");
  const { useFormStatus } = await import("@maroonedog/form-contract/react");

  const schema = z.object({
    items: z.array(z.object({ sku: z.string().min(1, "required") })),
  });
  const form = createForm({
    adapter: zodFormResolver(schema),
    defaultValues: { items: [{ sku: "a" }, { sku: "" }] },
  });

  const Row = ({ rowKey, at, participating }) => {
    useParticipation(form, at, participating);
    return h(Field, { path: `${at}.sku` }, (field) =>
      h("input", { ...field.inputProps, "data-testid": "sku-" + rowKey })
    );
  };

  const Screen = ({ silenceSecond }) =>
    h(
      FormProvider,
      { form },
      h(FieldRows, { path: "items" }, ({ rows }) =>
        rows.map((row) =>
          h(Row, {
            key: row.key,
            rowKey: row.key,
            at: row.path,
            participating: !(silenceSecond && row.index === 1),
          })
        )
      )
    );

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(h(Screen, { silenceSecond: false })));
  await act(async () => {
    form.validate();
  });
  assert.equal(form.store.read(errorCountCell), 1, "the empty sku blocks");

  await act(async () => root.render(h(Screen, { silenceSecond: true })));
  await act(async () => undefined);
  assert.equal(
    form.store.read(errorCountCell),
    0,
    "the row was switched off without being unmounted"
  );
  assert.equal(
    form.readRoot().items[1].sku,
    "",
    "and its value is still there"
  );
  await act(async () => root.unmount());
});
