// TEMPORARY review probe — delete after use.
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createForm, issuesCell, valueCell, errorCountCell } from "form-core";

const SCHEMA = z
  .object({ items: z.array(z.object({ sku: z.string().min(1) })) })
  .superRefine((value, ctx) => {
    const seen = new Set();
    value.items.forEach((row, index) => {
      if (seen.has(row.sku)) {
        ctx.addIssue({
          code: "custom",
          message: "duplicate sku",
          path: ["items", index, "sku"],
        });
      }
      seen.add(row.sku);
    });
  });

const form = createForm({
  adapter: zodFormResolver(SCHEMA),
  defaultValues: { items: [{ sku: "a" }, { sku: "a" }] },
  store: undefined,
});

const show = (label) => {
  const read = (path) => {
    const held = form.store.read(issuesCell(path));
    return held === undefined ? "(no cell)" : JSON.stringify(held.map((i) => `${i.path}:${i.message}`));
  };
  console.log(
    label,
    "\n  items[0].sku =", read("items[0].sku"),
    "\n  items[1].sku =", read("items[1].sku"),
    "\n  errorCount   =", form.store.read(errorCountCell),
    "\n  root         =", JSON.stringify(form.readRoot())
  );
};

console.log("descriptors:", form.descriptors.map((d) => d.path).join(", "));

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

console.log("first pass produced:", JSON.stringify(form.validate()));
show("after first pass");

form.rows("items").remove(0);
await settle();
show("after remove(0) + scheduled pass");

console.log("form.validate() now produces:", JSON.stringify(form.validate()));
show("after explicit validate()");

form.field("items[0].sku").setValue("totally-different");
await settle();
show("after setValue + pass");
