// ===========================================================================
// counting-cell-store.ts — the shipped store, wrapped so the runtime's traffic
// can be read off it.
//
// A decorator rather than a replacement: it delegates every member to
// `createCellStore`, so what is measured is the store the library actually
// ships and not a stand-in that might batch or notify differently. The form
// takes it through `FormOptions.store`, which is a supported seam — the same
// one `store-zustand` uses — so nothing in `packages/` changes to be measured.
//
// SUBSCRIPTIONS ARE TRACKED BECAUSE THAT IS WHERE THE OPEN SET LIVES.
// `create-form-cell-sources.ts` supplies the open and close callbacks, and
// `cell-source.ts`'s `subscribe` closure is what calls them alongside
// `store.subscribe(valueCell(path), …)` — on the way in and, through the
// teardown it returns, on the way out. So one live subscription on a `value:`
// key is exactly one reader in `open-value-cells.ts`'s count map, and the
// pairing lives in two files rather than one. That correspondence is a
// claim about somebody else's file, so it is not trusted: count-open-cell-scan
// takes the open set a second way, out of the runtime's own branch, and
// assert-design-claims.ts refuses to print anything unless the two agree.
//
// The unsubscribe returned here is idempotent because the contract says a
// caller may run a teardown twice; a decorator that decremented twice would
// invent a closed cell that is still open.
// ===========================================================================
import {
  createCellStore,
  type CellKey,
  type CellListener,
  type CellUnsubscribe,
  type FormCellStore,
} from "@maroonedog/form-contract/core";

export interface StoreTally {
  reads: number;
  writes: number;
  forgets: number;
  notificationsDelivered: number;
  /** Keys written since the last reset, in the order they were written. */
  readonly writtenKeys: string[];
  /** Keys read since the last reset. The branch a reader took is in here. */
  readonly readKeys: string[];
}

export interface CountingCellStore {
  readonly store: FormCellStore;
  readonly tally: StoreTally;
  /** Zeroes every counter and empties both key logs. */
  reset(): void;
  /** Value paths carrying at least one live subscription, unsorted. */
  liveValuePaths(): readonly string[];
}

const VALUE_PREFIX = "value:";

export function createCountingCellStore(): CountingCellStore {
  const inner = createCellStore();
  const liveByKey = new Map<string, number>();
  const tally: StoreTally = {
    reads: 0,
    writes: 0,
    forgets: 0,
    notificationsDelivered: 0,
    writtenKeys: [],
    readKeys: [],
  };

  const dropOne = (key: string): void => {
    const remaining = (liveByKey.get(key) ?? 0) - 1;
    if (remaining > 0) liveByKey.set(key, remaining);
    else liveByKey.delete(key);
  };

  const store: FormCellStore = {
    read<T>(key: CellKey<T>): T | undefined {
      tally.reads += 1;
      tally.readKeys.push(key);
      return inner.read(key);
    },
    write<T>(key: CellKey<T>, next: T): void {
      tally.writes += 1;
      tally.writtenKeys.push(key);
      inner.write(key, next);
    },
    forget(key) {
      tally.forgets += 1;
      inner.forget(key);
    },
    subscribe(key, listener): CellUnsubscribe {
      const counted: CellListener = () => {
        tally.notificationsDelivered += 1;
        listener();
      };
      const stop = inner.subscribe(key, counted);
      liveByKey.set(key, (liveByKey.get(key) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        dropOne(key);
        stop();
      };
    },
    batch: (writes) => inner.batch(writes),
  };

  return {
    store,
    tally,
    reset() {
      tally.reads = 0;
      tally.writes = 0;
      tally.forgets = 0;
      tally.notificationsDelivered = 0;
      tally.writtenKeys.length = 0;
      tally.readKeys.length = 0;
    },
    liveValuePaths: () =>
      [...liveByKey.keys()]
        .filter((key) => key.startsWith(VALUE_PREFIX))
        .map((key) => key.slice(VALUE_PREFIX.length)),
  };
}
