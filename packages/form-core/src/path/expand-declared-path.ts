// ===========================================================================
// expand-declared-path.ts — every concrete path a declared one covers, right
// now.
//
// A wildcard covers as many places as the value currently holds, so the answer
// depends on the value and not on the schema alone. Reading the length from
// the root is what makes this correct for a nested array, where the inner
// length differs per outer row.
//
// A wildcard standing over something that is not an array expands to nothing.
// That is the honest answer for a row that does not exist yet.
// ===========================================================================
import { readValueAt } from "./read-value-at.js";

const WILDCARD = "[*]";

function expandFrom(
  root: unknown,
  boundPrefix: string,
  rest: string,
  collected: string[]
): void {
  const at = rest.indexOf(WILDCARD);
  if (at === -1) {
    collected.push(boundPrefix + rest);
    return;
  }
  const arrayPath = boundPrefix + rest.slice(0, at);
  const held = readValueAt(root, arrayPath);
  if (!Array.isArray(held)) return;
  const remainder = rest.slice(at + WILDCARD.length);
  for (let index = 0; index < held.length; index += 1) {
    expandFrom(root, `${arrayPath}[${index}]`, remainder, collected);
  }
}

/** The concrete paths `declaredPath` covers in `root`, in index order. */
export function expandDeclaredPath(
  root: unknown,
  declaredPath: string
): readonly string[] {
  const collected: string[] = [];
  expandFrom(root, "", declaredPath, collected);
  return collected;
}
