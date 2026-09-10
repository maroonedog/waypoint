// ===========================================================================
// opaque-object.types.ts — object types a path stops at.
//
// A Date has getTime, a RegExp has exec, a Map has entries. None of them is a
// field a person fills in, so descending into one produces paths that type
// check and can never be rendered. The generator and the resolver both read
// this list, so the two directions cannot disagree about where a path ends.
// ===========================================================================

/** Built-in and callable types whose members are implementation, not data. */
export type OpaqueObject =
  | Date
  | RegExp
  | Error
  | Promise<unknown>
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | ArrayBuffer
  | ArrayBufferView
  | ((...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown);

export type IsOpaqueObject<T> = [T] extends [never]
  ? false
  : [NonNullable<T>] extends [OpaqueObject]
    ? true
    : false;
