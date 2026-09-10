import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createForm, rowsCell, valueCell } from "form-core";

const SCHEMA = z.object({
  groups: z.array(z.object({
    title: z.string().min(1),
    items: z.array(z.object({ sku: z.string().min(1) })),
  })),
});

const defaults = {
  groups: [
    { title: "g0", items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }] },
    { title: "g1", items: [{ sku: "d" }] },
  ],
};

const adapter = zodFormResolver(SCHEMA);
console.log("descriptors:", adapter.fields.map((f) => f.path));

const form = createForm({ adapter, defaultValues: structuredClone(defaults), store: undefined });

console.log("rowsCell(groups):", form.store.read(rowsCell("groups")));
console.log("rowsCell(groups[0].items):", form.store.read(rowsCell("groups[0].items")));
console.log("rowsCell(groups[1].items):", form.store.read(rowsCell("groups[1].items")));

const outer = form.rows("groups");
console.log("outer ids:", outer.ids.read());
const inner0 = form.rows("groups[0].items");
console.log("inner0 ids.read():", inner0.ids.read());
console.log("root groups[0].items:", JSON.stringify(form.readRoot().groups[0].items));

// does subscribing change anything?
const stop = inner0.ids.subscribe(() => {});
console.log("after subscribe, inner0 ids.read():", inner0.ids.read());
stop();

inner0.insert(1, { sku: "new" });
console.log("after insert -> ids:", inner0.ids.read());
console.log("after insert -> root:", JSON.stringify(form.readRoot().groups[0].items));
