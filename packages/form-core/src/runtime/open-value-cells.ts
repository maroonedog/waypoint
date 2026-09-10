// ===========================================================================
// open-value-cells.ts — which value paths currently have a reader.
//
// A leaf edit changes the leaf, the root, and every container that contains
// it. Writing every container unconditionally would wake nobody most of the
// time and cost a read per ancestor every keystroke, so the fan-out asks here
// first and writes only what someone is actually looking at.
//
// Counted rather than flagged: two components may read the same path, and the
// first of them to unmount must not close the cell the second still reads.
// ===========================================================================

export interface OpenValueCells {
  open(path: string): void;
  close(path: string): void;
  isOpen(path: string): boolean;
  forEachOpen(visit: (path: string) => void): void;
}

export function createOpenValueCells(): OpenValueCells {
  const readerCounts = new Map<string, number>();

  return {
    open(path) {
      readerCounts.set(path, (readerCounts.get(path) ?? 0) + 1);
    },
    close(path) {
      const remaining = (readerCounts.get(path) ?? 0) - 1;
      if (remaining > 0) readerCounts.set(path, remaining);
      else readerCounts.delete(path);
    },
    isOpen: (path) => readerCounts.has(path),
    forEachOpen(visit) {
      for (const path of Array.from(readerCounts.keys())) visit(path);
    },
  };
}
