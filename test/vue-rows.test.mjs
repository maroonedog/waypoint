// A list, in Vue: the order, the three edits, and the address a row hands
// down.
//
// The claim worth holding here is the one a list makes about the rest of the
// form: a row carries its own ADDRESS, so a nested component builds
// `` `${row.path}.sku` `` and nothing ambient rewrites what it asked for. That
// is what `<FieldRows>` exists to hand over, and it is the same mechanism the
// React binding uses — what differs is only that the slot is a scoped slot.
//
// AND THE SUBSCRIPTION IS TO THE ORDER ALONE. Typing inside a row must not
// redraw the list, which is exactly the thing a list built on one bundled
// snapshot gets wrong, so the redraw count is asserted rather than described.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./support/dom.mjs";
import { find, mountIntoDocument, typeInto } from "./support/vue-root.mjs";
import { settle } from "./support/scheduled-pass.mjs";

const { z } = await import("zod");
const { h } = await import("vue");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { Field, FieldRows, FormProvider } = await import(
  "@maroonedog/waypoint/vue"
);

const SCHEMA = z.object({
  items: z.array(z.object({ sku: z.string().min(2) })),
});

const newForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: { items: [{ sku: "A-1" }, { sku: "B-2" }] },
  });

/** The list, with one input per row, drawn entirely by the caller. */
const listScreen = { drawn: 0 };
const screen = {
  setup: () => () =>
    h(FieldRows, { path: "items" }, {
      default: (list) => {
        listScreen.drawn += 1;
        return [
          h(
            "ul",
            { id: "rows" },
            list.rows.map((row) =>
              h("li", { key: row.key }, [
                h(Field, { path: `${row.path}.sku` }, {
                  default: (sku) => [h("input", sku.inputProps)],
                }),
              ])
            )
          ),
          h("button", {
            id: "add",
            onClick: () => list.insert(list.rows.length, { sku: "" }),
          }),
          h("button", { id: "drop", onClick: () => list.remove(0) }),
        ];
      },
    }),
};

const mountList = (form) =>
  mountIntoDocument({
    setup: () => () =>
      h(FormProvider, { form }, { default: () => h(screen) }),
  });

const skus = (container) =>
  [...container.querySelectorAll("input")].map((input) => input.value);

const names = (container) =>
  [...container.querySelectorAll("input")].map((input) => input.name);

test("a row hands down an address a nested field can build a path from", () => {
  const form = newForm();
  const { container, app } = mountList(form);
  assert.deepEqual(skus(container), ["A-1", "B-2"]);
  assert.deepEqual(names(container), ["items[0].sku", "items[1].sku"]);
  app.unmount();
});

test("inserting and removing move the order, and the fields follow", async () => {
  const form = newForm();
  const { container, app } = mountList(form);

  find(container, "add").click();
  await settle();
  assert.deepEqual(skus(container), ["A-1", "B-2", ""]);

  find(container, "drop").click();
  await settle();
  assert.deepEqual(
    skus(container),
    ["B-2", ""],
    "removing the first row must take its VALUE with it, not leave it behind " +
      "for the row that inherits the index"
  );
  app.unmount();
});

test("typing inside a row does not redraw the list", async () => {
  const form = newForm();
  listScreen.drawn = 0;
  const { container, app } = mountList(form);
  const after = listScreen.drawn;

  typeInto(container.querySelectorAll("input")[0], "C-3");
  await settle();
  assert.equal(form.field("items[0].sku").sources.value.read(), "C-3");
  assert.equal(
    listScreen.drawn,
    after,
    "the subscription is to the order, so an edit inside a row wakes nobody above it"
  );
  app.unmount();
});
