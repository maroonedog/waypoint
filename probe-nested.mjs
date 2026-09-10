// TEMPORARY PROBE — delete after review.
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createForm, issuesCell, rowsCell, valueCell, touchedCell } from "form-core";

const SCHEMA = z.object({
  groups: z.array(
    z.object({
      title: z.string().min(1),
      items: z.array(z.object({ sku: z.string().min(1) })),
    })
  ),
});

const form = createForm({
  adapter: zodFormResolver(SCHEMA),
  defaultValues: {
    groups: [
      { title: "g0", items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }] },
      { title: "g1", items: [{ sku: "" }] },
    ],
  },
  store: undefined,
});

console.log("descriptors:", form.descriptors.map((d) => d.path));
form.validate();
console.log("issue on the bad inner row:", form.store.read(issuesCell("groups[1].items[0].sku"))?.map((i) => i.code));
console.log("inner row ids before: groups[0].items =", form.store.read(rowsCell("groups[0].items")),
  " groups[1].items =", form.store.read(rowsCell("groups[1].items")));

form.rows("groups").remove(0);
form.validate();

console.log("");
console.log("root after remove(0):", JSON.stringify(form.readRoot()));
console.log("issue moved to groups[0].items[0].sku:",
  form.store.read(issuesCell("groups[0].items[0].sku"))?.map((i) => i.code));
console.log("stale at groups[1].items[0].sku:",
  form.store.read(issuesCell("groups[1].items[0].sku"))?.map((i) => i.code));
console.log("inner row ids after:  groups[0].items =", form.store.read(rowsCell("groups[0].items")),
  " groups[1].items =", form.store.read(rowsCell("groups[1].items")));
console.log("  the surviving group holds", form.readRoot().groups[0].items.length, "item(s)");

console.log("");
console.log("=== what a nested <FieldRows path=\"items\"> inside a group scope sees");
const inner = form.rows("groups[0].items");
console.log("  data rows:", form.readRoot().groups[0].items.length);
console.log("  ids the list renders:", inner.ids.read());
inner.insert(1, { sku: "new" });
console.log("  after insert(1):");
console.log("    data rows:", form.readRoot().groups[0].items.length, JSON.stringify(form.readRoot().groups[0].items));
console.log("    ids:", inner.ids.read());
