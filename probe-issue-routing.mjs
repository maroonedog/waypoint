// TEMPORARY PROBE — delete after review.
import { z } from "zod";
import { zodFormResolver } from "form-contract-resolver-zod";
import { createForm, issuesCell, errorCountCell } from "form-core";

// A duplicate-key rule: the ordinary "these emails/skus must be unique" rule.
// It reports on the LATER duplicate, so the set of issue PATHS depends on the
// row order.
const SCHEMA = z
  .object({
    items: z.array(z.object({ sku: z.string().min(1) })),
  })
  .superRefine((root, ctx) => {
    const seen = new Set();
    root.items.forEach((row, index) => {
      if (seen.has(row.sku)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "sku"],
          message: "duplicate sku",
        });
      }
      seen.add(row.sku);
    });
  });

const build = (items) =>
  createForm({
    adapter: {
      ...zodFormResolver(z.object({ items: z.array(z.object({ sku: z.string().min(1) })) })),
      validate: (root) => {
        const outcome = SCHEMA.safeParse(root);
        if (outcome.success) return [];
        return outcome.error.issues.map((issue) => ({
          path: issue.path
            .map((seg, i) =>
              typeof seg === "number" ? `[${seg}]` : i === 0 ? seg : `.${seg}`
            )
            .join(""),
          message: issue.message,
          code: issue.code,
          severity: "error",
        }));
      },
    },
    defaultValues: structuredClone({ items }),
    store: undefined,
  });

const dump = (form, paths) => {
  for (const path of paths) {
    const held = form.store.read(issuesCell(path));
    console.log(
      `   issues[${path}] =`,
      held === undefined ? "(no cell)" : held.map((i) => i.message)
    );
  }
  console.log("   errorCount =", form.store.read(errorCountCell));
};

console.log("=== A. remove(0): the duplicate disappears when the pair breaks up");
{
  const form = build([{ sku: "a" }, { sku: "a" }]);
  form.validate();
  console.log("  after first pass (row 1 is the duplicate):");
  dump(form, ["items[0].sku", "items[1].sku"]);

  form.rows("items").remove(0);
  await Promise.resolve();
  await Promise.resolve();
  form.validate();
  console.log("  after remove(0) + a validation pass (one row left, no duplicate):");
  dump(form, ["items[0].sku", "items[1].sku"]);
  console.log("   root =", JSON.stringify(form.readRoot()));
  console.log("   validate() produced:", form.validate().map((i) => i.message));
}

console.log("");
console.log("=== B. move(2,0): the duplicate moves to a different index");
{
  const form = build([{ sku: "a" }, { sku: "b" }, { sku: "a" }]);
  form.validate();
  console.log("  after first pass (row 2 is the duplicate):");
  dump(form, ["items[0].sku", "items[1].sku", "items[2].sku"]);

  form.rows("items").move(2, 0);
  await Promise.resolve();
  await Promise.resolve();
  form.validate();
  console.log("  after move(2,0) + a validation pass (skus are a,a,b: row 1 duplicates):");
  dump(form, ["items[0].sku", "items[1].sku", "items[2].sku"]);
  console.log("   root =", JSON.stringify(form.readRoot()));
  console.log("   validate() produced:", form.validate().map((i) => `${i.path}: ${i.message}`));
}

console.log("");
console.log("=== C. can the stale cell ever be cleared afterwards?");
{
  const form = build([{ sku: "a" }, { sku: "a" }]);
  form.validate();
  form.rows("items").remove(0);
  form.validate();
  console.log("  stale cell:", form.store.read(issuesCell("items[0].sku"))?.map((i) => i.message));
  // Type into the field, then validate again.
  form.field("items[0].sku").setValue("zzz");
  form.validate();
  console.log("  after editing the field and revalidating:");
  dump(form, ["items[0].sku"]);
  console.log("  issue.path of what the cell holds:", form.store.read(issuesCell("items[0].sku"))?.map((i) => i.path));
}
