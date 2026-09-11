// ===========================================================================
// issue-path-to-concrete-path.ts
//
// Every library spells an issue's address differently — an array of segments,
// a dotted string, a nested object of errors. The DOM does not: a message is
// rendered next to the input whose path it belongs to. Comparison therefore
// happens in ONE spelling, and this is where everything is brought into it.
// ===========================================================================

export function issuePathToConcretePath(
  segments: readonly (string | number | symbol)[]
): string {
  let formatted = "";
  for (const segment of segments) {
    if (typeof segment === "number") formatted += `[${segment}]`;
    else if (typeof segment === "string") {
      formatted = formatted === "" ? segment : `${formatted}.${segment}`;
    }
  }
  return formatted;
}

/** `{ applicant: { lastName: { message } } }` becomes a flat path map. */
export function flattenNestedErrors(
  held: unknown,
  prefix = "",
  into: Map<string, string> = new Map()
): ReadonlyMap<string, string> {
  if (held === null || typeof held !== "object") return into;
  const holder = held as Record<string, unknown>;
  const message = holder["message"];
  if (typeof message === "string") {
    if (prefix !== "") into.set(prefix, message);
    return into;
  }
  for (const [key, value] of Object.entries(holder)) {
    const next = Array.isArray(held)
      ? `${prefix}[${key}]`
      : prefix === ""
        ? key
        : `${prefix}.${key}`;
    flattenNestedErrors(value, next, into);
  }
  return into;
}
