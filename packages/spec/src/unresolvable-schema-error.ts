// ===========================================================================
// unresolvable-schema-error.ts
//
// Thrown when nothing can describe the schema. It is an error rather than an
// empty list because the two mean opposite things to a caller: a form with no
// declared fields is a form that renders nothing, and a schema nobody
// understands is a wiring mistake that should be fixed before it ships.
//
// The message names the vendors that were offered, because the fix is almost
// always to add the missing resolver and the reader needs to know which ones
// were already there.
// ===========================================================================

/** No resolver matched, and the schema does not describe itself. */
export class UnresolvableSchemaError extends Error {
  readonly offeredVendors: readonly string[];

  constructor(offeredVendors: readonly string[]) {
    const offered =
      offeredVendors.length === 0
        ? "no resolvers were supplied"
        : `resolvers supplied: ${offeredVendors.join(", ")}`;
    super(
      `The schema does not implement "~form" and no resolver claimed it ` +
        `(${offered}).`
    );
    this.name = "UnresolvableSchemaError";
    this.offeredVendors = offeredVendors;
  }
}
