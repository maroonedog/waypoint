// ===========================================================================
// field-handle-cache.ts — one handle per path, for the life of the form.
//
// The handle owns setValue and markTouched, so a fresh handle per render would
// hand every input a new onChange every render. Keeping the handle keeps those
// callbacks identical, which is what lets a memoised child stay memoised.
// ===========================================================================
import type { FieldHandle } from "./form.types.js";

export interface FieldHandleCache {
  of<TValue>(path: string, create: () => FieldHandle<TValue>): FieldHandle<TValue>;
}

export function createFieldHandleCache(): FieldHandleCache {
  const handles = new Map<string, FieldHandle<never>>();

  return {
    of<TValue>(path: string, create: () => FieldHandle<TValue>) {
      const existing = handles.get(path);
      // A path is only ever asked for with one value type; the path is what
      // carries it.
      if (existing !== undefined) return existing as unknown as FieldHandle<TValue>;
      const created = create();
      handles.set(path, created as unknown as FieldHandle<never>);
      return created;
    },
  };
}
