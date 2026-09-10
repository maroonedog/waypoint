// ===========================================================================
// format-issue-path.ts — zod's path array as the string a form addresses.
//
// zod reports a path as segments, mixing member names and array indices.
// A form addresses one string, and the index has to survive: an issue on
// `items[2].quantity` marks the third row and not the shape, so the index is
// written into the string rather than replaced by a wildcard.
// ===========================================================================

/** `["items", 2, "quantity"]` becomes `"items[2].quantity"`. */
export function formatIssuePath(
  segments: readonly (string | number | symbol)[]
): string {
  let formatted = "";
  for (const segment of segments) {
    if (typeof segment === "number") {
      formatted += `[${segment}]`;
    } else if (typeof segment === "string") {
      formatted = formatted === "" ? segment : `${formatted}.${segment}`;
    }
  }
  return formatted;
}
