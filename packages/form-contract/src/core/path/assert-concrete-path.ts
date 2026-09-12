// ===========================================================================
// assert-concrete-path.ts — refuses a path that addresses a shape.
//
// `items[*].quantity` names every quantity in the list; there is no single
// value to read or write there. The bracket grammar has no wildcard case, so
// without this guard `[*]` parses as a member literally named `*` and a write
// replaces the whole array with an object holding one key — silently, taking
// every row with it.
//
// The guard is here rather than in the grammar because the grammar's job is to
// say what a concrete path means, and a wildcard is not one. Refusing it at
// the point a caller supplies it names the caller in the stack.
// ===========================================================================

const WILDCARD = "[*]";

/** @throws TypeError when `path` addresses a shape rather than a value. */
export function assertConcretePath(path: string): void {
  if (path.includes(WILDCARD)) {
    throw new TypeError(
      `"${path}" is a rule, not a place. One field is one place, so give the ` +
        "row a real index — a list hands each row its own address as " +
        "`row.path`, and `${row.path}` plus the rest of the name is the " +
        "whole of it. If you meant every place the rule covers, that is a " +
        "column: read it with useFieldValues."
    );
  }
}
