// TEMPORARY PROBE — delete after review.
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
} catch {}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { zodFormResolver } = await import("form-contract-resolver-zod");
const { createForm } = await import("form-core");
const { FormProvider, Field, FieldRows, FieldScope, useCell, useForm } =
  await import("form-react");

const { act, createElement: h, Fragment } = React;

const BASE = z.object({ items: z.array(z.object({ sku: z.string().min(1) })) });
const SCHEMA = BASE.superRefine((root, ctx) => {
  const seen = new Set();
  root.items.forEach((row, index) => {
    if (seen.has(row.sku)) {
      ctx.addIssue({ code: "custom", path: ["items", index, "sku"], message: "duplicate sku" });
    }
    seen.add(row.sku);
  });
});

const adapter = {
  ...zodFormResolver(BASE),
  validate: (root) => {
    const outcome = SCHEMA.safeParse(root);
    if (outcome.success) return [];
    return outcome.error.issues.map((issue) => ({
      path: issue.path
        .map((seg, i) => (typeof seg === "number" ? `[${seg}]` : i === 0 ? seg : `.${seg}`))
        .join(""),
      message: issue.message,
      code: issue.code,
      severity: "error",
    }));
  },
};

const form = createForm({
  adapter,
  defaultValues: { items: [{ sku: "a" }, { sku: "a" }] },
  store: undefined,
});

const ErrorCount = () => {
  const count = useCell(useForm().errorCount);
  return h("p", { id: "count" }, `errors: ${count}`);
};

const Screen = () =>
  h(
    FormProvider,
    { form },
    h(ErrorCount, null),
    h(FieldRows, { path: "items" }, (binding) =>
      h(
        Fragment,
        null,
        binding.rows.map((row) =>
          h(
            FieldScope,
            { key: row.key, row },
            h(Field, { path: "items[*].sku" }, (field) =>
              h(
                "div",
                null,
                h("input", { ...field.inputProps, value: field.value ?? "" }),
                h("span", { className: "err" }, field.issues.map((i) => i.message).join(","))
              )
            )
          )
        )
      )
    )
  );

const host = document.createElement("div");
document.body.appendChild(host);
const root = createRoot(host);
await act(async () => root.render(h(Screen, null)));
await act(async () => { form.validate(); });

const shown = () =>
  Array.from(host.querySelectorAll(".err")).map((n) => n.textContent);
console.log("two rows, both 'a':", shown(), document.getElementById("count").textContent);

await act(async () => { form.rows("items").remove(0); });
await act(async () => { form.validate(); });
console.log("after remove(0):     ", shown(), document.getElementById("count").textContent);
console.log("root:", JSON.stringify(form.readRoot()));

// Type something completely different into the surviving row.
const input = host.querySelector("input");
await act(async () => { form.field("items[0].sku").setValue("totally-different"); });
await act(async () => { form.validate(); });
console.log("after editing it:    ", shown(), document.getElementById("count").textContent);
console.log("input value:", input.value);

// Counterfactual: the cell is unclearable only because the record never names
// it. Make a REAL issue land on that same path once, so distributeIssues
// records it, then fix it — now it clears.
await act(async () => { form.field("items[0].sku").setValue(""); });
await act(async () => { form.validate(); });
console.log("after emptying it:  ", shown(), document.getElementById("count").textContent);
await act(async () => { form.field("items[0].sku").setValue("fine"); });
await act(async () => { form.validate(); });
console.log("after refilling it: ", shown(), document.getElementById("count").textContent);
