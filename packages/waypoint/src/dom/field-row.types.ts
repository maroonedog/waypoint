// ===========================================================================
// field-row.types.ts — one row, as a list renders it.
//
// A FILE NO FRAMEWORK OWNS. A row is a key, an index and an address: the key
// is for whatever reconciles the list, and the other two are the form's.
//
// The row carries its own ADDRESS. That is the whole mechanism now: a nested
// component is handed `row.path` and builds the paths it wants from it, so
// nothing ambient has to rewrite what it asks for.
//
// The address is typed as a place in THIS list — `` `form:items[${number}]` ``
// — which is what lets `` `${row.path}.sku` `` come out as a path the registry
// recognises. A row that only promised `string` would hand every component
// below it an unchecked path, and the checking would stop at the first list.
//
// IT CARRIES WHATEVER THE CALLER WROTE, prefix and all, so a qualified list
// hands down a whole address rather than half of one. The list knew which form
// it was reading; until the form could be part of the path that knowledge
// stopped at the row, and a component built `` `${row.path}.sku` `` from it and
// still needed a key threaded down beside it. A sole-form application writing
// `useRows("items")` gets rows at `items[0]` with no form in them, which is
// the same spelling it wrote and the same one it can address.
//
// There was a `<FieldScope row={row}>` here once, and passing the row to it so
// that it could put the row back into context was a round trip through the
// tree for information the caller already held. Worse, a scope rewrote EVERY
// path below it with no way out: a component inside `prefix="billing"` asking
// for `shipping.postcode` silently got `billing.shipping.postcode` and
// rendered nothing. An address passed as a prop cannot do that to anybody.
// ===========================================================================

export interface FieldRow<TPath extends string = string> {
  /** Opaque, stable for the life of the row: the list key and never an address. */
  readonly key: string;
  readonly index: number;
  /**
   * Where this row lives, concretely and qualified: `form:items[2]`. Build a
   * field's path from it — `` `${row.path}.sku` `` — and nothing else is
   * needed to address it, the form included.
   */
  readonly path: `${TPath}[${number}]`;
}
