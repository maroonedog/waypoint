// ===========================================================================
// resolve-scoped-path.ts — a name written locally, addressed globally.
//
// Two steps, in this order. The prefix turns a local name into the declared
// path it means, and the indices turn that declared path into the one place
// this render is looking at.
//
// A path left with a wildcard is an error rather than a guess: the component
// is outside a row scope it needs, and binding index zero instead would
// silently address the first row of a list the caller never entered.
// ===========================================================================
import { bindDeclaredPath } from "form-core";
import type { FieldScopeValue } from "./field-scope-context.js";

/** The declared path a local name means inside a scope. */
export function declaredPathIn(
  localPath: string,
  scope: FieldScopeValue
): string {
  if (scope.prefix === "") return localPath;
  return localPath === "" ? scope.prefix : `${scope.prefix}.${localPath}`;
}

/**
 * The concrete path a local name addresses inside a scope.
 *
 * @throws Error when the scope supplies fewer indices than the path needs.
 */
export function resolveScopedPath(
  localPath: string,
  scope: FieldScopeValue
): string {
  const declared = declaredPathIn(localPath, scope);
  const bound = bindDeclaredPath(declared, scope.indices);
  if (bound === undefined) {
    throw new Error(
      `"${declared}" needs a row index this scope does not supply. Render it ` +
        `inside a <FieldScope row={row}> for each of its arrays.`
    );
  }
  return bound;
}
