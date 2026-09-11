// ===========================================================================
// mount-context.types.ts — everything a subject is handed, and nothing else.
//
// A subject reaches for no module-level schema and no module-level defaults.
// It is given the shape it is being measured on, which is what lets the same
// subject be swept across sizes without a line of it changing.
// ===========================================================================

export interface MountContext {
  /** The shared schema, already wrapped by the harness counter. */
  readonly schema: object;
  /** The leaves to render. Empty when the wiring overhead is being measured. */
  readonly paths: readonly string[];
  /** A fresh root the schema accepts. */
  defaults(): unknown;
}
