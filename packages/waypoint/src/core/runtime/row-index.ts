// ===========================================================================
// row-index.ts — the opaque id a row keeps for its whole life.
//
// A row id is the React key. It survives every splice, so the DOM node, the
// focus and any local state inside the row survive with it; the concrete index
// underneath moves, and the cells move with it.
//
// Ids are minted from a counter rather than from randomness. A form built the
// same way twice produces the same ids, which is what makes a rendered list
// comparable between a server pass and the client pass that follows it, and
// what lets a test name a row.
// ===========================================================================

export interface RowIdMinter {
  next(): string;
}

export function createRowIdMinter(): RowIdMinter {
  let minted = 0;
  return {
    next() {
      const id = `r${minted}`;
      minted += 1;
      return id;
    },
  };
}

/** Ids for a list that already holds `length` rows. */
export function mintRowIds(minter: RowIdMinter, length: number): readonly string[] {
  const ids: string[] = [];
  for (let at = 0; at < length; at += 1) ids.push(minter.next());
  return ids;
}
