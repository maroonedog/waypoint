import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
try { Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true }); } catch {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { zodFormResolver } = await import("form-contract-resolver-zod");
const { createForm } = await import("form-core");
const { FormProvider, Field, FieldRows, FieldScope } = await import("form-react");
const { act, createElement: h, Fragment } = React;

const SCHEMA = z.object({
  groups: z.array(z.object({
    title: z.string().min(1),
    items: z.array(z.object({ sku: z.string().min(1) })),
  })),
});
const DEFAULTS = {
  groups: [
    { title: "g0", items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }] },
    { title: "g1", items: [{ sku: "d" }] },
  ],
};

const form = createForm({ adapter: zodFormResolver(SCHEMA), defaultValues: structuredClone(DEFAULTS), store: undefined });

let innerInsert = null;
const Screen = () =>
  h(FormProvider, { form },
    h(FieldRows, { path: "groups" }, ({ rows }) =>
      h(Fragment, null, rows.map((row) =>
        h(FieldScope, { key: row.key, row },
          h("div", { className: "group" },
            h(Field, { path: "groups[*].title" }, (f) => h("input", { ...f.inputProps, "data-title": String(row.index) })),
            h(FieldRows, { path: "groups[*].items" }, (inner) => {
              if (row.index === 0) innerInsert = inner.insert;
              return h(Fragment, null, inner.rows.map((ir) =>
                h(FieldScope, { key: ir.key, row: ir },
                  h(Field, { path: "groups[*].items[*].sku" }, (f) =>
                    h("input", { ...f.inputProps, "data-sku": `${row.index}-${ir.index}` })))));
            })
          )))
      )));

const host = document.createElement("div");
document.body.appendChild(host);
const root = createRoot(host);
await act(async () => { root.render(h(Screen)); });

const skus = () => Array.from(host.querySelectorAll("input[data-sku]")).map((i) => i.getAttribute("data-sku") + ":" + i.value);
console.log("titles rendered:", host.querySelectorAll("input[data-title]").length);
console.log("sku inputs rendered:", skus());
console.log("root value:", JSON.stringify(form.readRoot()));

await act(async () => { innerInsert(1, { sku: "new" }); });
console.log("after inner insert -> sku inputs:", skus());
console.log("after inner insert -> root groups[0].items:", JSON.stringify(form.readRoot().groups[0].items));

await act(async () => { root.unmount(); });
