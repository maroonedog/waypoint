// ===========================================================================
// field-row.types.ts — one row, as a list renders it.
//
// The row carries its own ADDRESS. That is the whole mechanism now: a nested
// component is handed `row.path` and builds the paths it wants from it, so
// nothing ambient has to rewrite what it asks for.
//
// There was a `<FieldScope row={row}>` here once, and passing the row to it so
// that it could put the row back into context was a round trip through the
// tree for information the caller already held. Worse, a scope rewrote EVERY
// path below it with no way out: a component inside `prefix="billing"` asking
// for `shipping.postcode` silently got `billing.shipping.postcode` and
// rendered nothing. An address passed as a prop cannot do that to anybody.
// ===========================================================================

export interface FieldRow {
  /** Opaque, stable for the life of the row: the React key and never an address. */
  readonly key: string;
  readonly index: number;
  /**
   * Where this row lives, concretely: `items[2]`. Build a field's path from
   * it — `` `${row.path}.sku` `` — and nothing else is needed to address it.
   */
  readonly path: string;
}
