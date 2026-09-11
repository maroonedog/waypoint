// ===========================================================================
// declared-paths.ts — the leaves every subject must render, in one order.
//
// Taken from the shared schema through the shared resolver rather than typed
// out, so a schema change cannot leave one subject rendering a field another
// does not. The order is the descriptor order, which is declaration order, and
// every subject renders in it — a DOM comparison is meaningless otherwise.
//
// Wildcard paths are bound to the rows the defaults hold. Rows are fixed in
// this lane: no interaction inserts, removes or moves one, so a subject needs
// no row machinery to be comparable here.
// ===========================================================================
import { zodFormResolver } from "form-contract-resolver-zod";
import { expandDeclaredPath } from "form-core";
import { orderSchema } from "./order-schema.ts";
import { orderDefaults } from "./order-defaults.ts";

const adapter = zodFormResolver(orderSchema);

export const declaredPaths: readonly string[] = adapter.fields.map(
  (field) => field.path
);

export const concretePaths: readonly string[] = (() => {
  const root = orderDefaults();
  const bound: string[] = [];
  for (const declared of declaredPaths) {
    for (const path of expandDeclaredPath(root, declared)) bound.push(path);
  }
  return bound;
})();

/** The descriptor for a concrete path, for a subject that wants the label. */
export const descriptorOf = (concretePath: string) =>
  adapter.fields.find(
    (field) => field.path === concretePath.replace(/\[\d+\]/g, "[*]")
  );
