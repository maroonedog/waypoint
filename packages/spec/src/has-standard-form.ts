// ===========================================================================
// has-standard-form.ts — recognises a schema that describes itself.
//
// The version is checked, not just the property's presence. A future version
// would carry a different shape under the same property name, and treating it
// as this one would read members that are not there.
// ===========================================================================
import type { StandardFormV1 } from "./standard-form.types.js";

/** True when the schema carries a version 1 `~form`. */
export function hasStandardForm(schema: unknown): schema is StandardFormV1 {
  if (typeof schema !== "object" || schema === null) return false;
  const candidate = Reflect.get(schema, "~form");
  if (typeof candidate !== "object" || candidate === null) return false;
  return (
    Reflect.get(candidate, "version") === 1 &&
    typeof Reflect.get(candidate, "fields") === "function"
  );
}
