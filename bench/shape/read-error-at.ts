// ===========================================================================
// read-error-at.ts — one message out of a nested error object.
//
// react-hook-form and Formik both hold errors in a tree shaped like the
// values. A leaf reads its own message, so walking the whole tree on every
// render would charge them for work their idiom does not do.
// ===========================================================================

const SEGMENTS = /[^.[\]]+/g;

export function readErrorAt(errors: unknown, path: string): string | undefined {
  let held: unknown = errors;
  for (const segment of path.match(SEGMENTS) ?? []) {
    if (held === null || typeof held !== "object") return undefined;
    held = (held as Record<string, unknown>)[segment];
  }
  if (held === null || typeof held !== "object") return undefined;
  const message = (held as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}
