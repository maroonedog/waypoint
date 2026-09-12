// ===========================================================================
// format-issue-path.ts — a vendor's path segments as the string a form
// addresses.
//
// A form addresses ONE string, and the index has to survive: an issue on
// `items[2].quantity` marks the third row and not the shape, so the index is
// written into the string rather than replaced by a wildcard.
//
// This began as zod's and is now everyone's, because the issue path is the one
// place the Standard Schema spec leaves a real choice. It types the member as
// `ReadonlyArray<PropertyKey | { key: PropertyKey }>` — read from zod's
// vendored copy of the spec — so a segment may be a bare string or number, or
// an object wrapping either, and a vendor picks. Both spellings are unwrapped
// here rather than in each resolver, which is the whole reason there is one of
// these and not one per vendor.
//
// `path` is optional in the spec and this reads an untyped vendor's output, so
// anything that is not an array yields the empty path rather than throwing. An
// issue that lands on the root is a real thing — a rule comparing two fields
// can report against neither — and the runtime already carries it.
//
// A `symbol` segment is dropped. It cannot be spelled in a path a form
// addresses, and stringifying it would produce a path no field has.
// ===========================================================================
import type { StandardPathSegment } from "./standard-schema.types.js";

/**
 * The object spelling is unwrapped; the bare spelling is already the key.
 * Nothing else is accepted, so a vendor that invents a third shape loses that
 * segment rather than contributing `[object Object]` to a path.
 */
const keyOf = (
  segment: PropertyKey | StandardPathSegment
): PropertyKey | undefined =>
  typeof segment === "object" && segment !== null ? segment.key : segment;

/** `["items", 2, "sku"]` becomes `"items[2].sku"`. */
export function formatIssuePath(path: unknown): string {
  if (!Array.isArray(path)) return "";

  let formatted = "";
  for (const segment of path as readonly (PropertyKey | StandardPathSegment)[]) {
    const key = keyOf(segment);
    if (typeof key === "number") {
      formatted += `[${key}]`;
      continue;
    }
    if (typeof key !== "string") continue;
    formatted = formatted === "" ? key : `${formatted}.${key}`;
  }
  return formatted;
}
