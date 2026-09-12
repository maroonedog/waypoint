// ===========================================================================
// form-cell-store.types.ts — the swappable half of the runtime.
//
// A cell is an opaque key holding one Object.is-comparable value with its own
// listener set. Values, issues, flags and aggregates differ only by the prefix
// in their key, and nothing here parses a key: what a path MEANS is runtime
// code written against these five members, so substituting a store is an
// adapter and never a port.
//
// The rules below are normative, not advisory. assert-form-store-contract.ts
// checks each of them, because "per-key notification" left as a sentence in a
// doc comment is how every adapter quietly degrades to broadcast.
// ===========================================================================

declare const CELL_VALUE: unique symbol;

/**
 * A cell name that remembers what the cell holds. The phantom sits in a return
 * position so `CellKey<string>` is assignable to `CellKey<unknown>`, which is
 * what `subscribe` and `forget` need.
 */
export type CellKey<T> = string & { readonly [CELL_VALUE]: () => T };

/** Takes no argument: the reader pulls with `read`. */
export type CellListener = () => void;

/** Idempotent — React runs the teardown of an effect it is about to rerun. */
export type CellUnsubscribe = () => void;

export interface FormCellStore {
  /**
   * The value last written, or undefined when nothing was.
   *
   * A cross-field rule reads a sibling whose component has never mounted, so a
   * read must answer for a key with no subscriber. A store that materialises
   * state on subscription cannot back this form.
   */
  read<T>(key: CellKey<T>): T | undefined;

  /**
   * Replaces the value and notifies that key's listeners.
   *
   * A write whose value is Object.is-equal to the current one MUST NOT notify:
   * a consumer forced to defend itself runs one comparison per subscriber per
   * write, which is the cost model this contract exists to avoid.
   *
   * A write to one key MUST NOT reach a listener on another. A store that can
   * only broadcast satisfies these types and fails the requirement.
   *
   * Notification MUST be synchronous. React re-asserts a controlled input's
   * value from the committed props at the end of the event flush, so a store
   * that defers to a microtask drops the typed character.
   */
  write<T>(key: CellKey<T>, next: T): void;

  /**
   * Removes the cell, notifying once; a later read returns undefined.
   *
   * Array cells are keyed by concrete index, so shrinking a list orphans every
   * cell under the removed rows. Without reclamation a grid that churns rows
   * leaks cells and closures without bound.
   */
  forget(key: CellKey<unknown>): void;

  /**
   * The listener takes no argument because that is the lowest common
   * denominator across the stores worth adapting, and it is exactly what
   * useSyncExternalStore wants. Pull-on-notify costs nothing: `read` exists.
   *
   * subscribe/unsubscribe/subscribe must be lossless — a notification landing
   * in the gap leaves a stale screen with no symptom.
   */
  subscribe(key: CellKey<unknown>, listener: CellListener): CellUnsubscribe;

  /**
   * Runs `writes`, then notifies once per key that actually changed, before
   * returning. Nested calls collapse into the outermost.
   *
   * One user action is routinely many writes: a leaf edit touches the root,
   * the leaf and every live ancestor. Outside a React event handler each
   * notification would otherwise schedule its own synchronous render.
   *
   * A read inside the batch MUST see a write made earlier in the same batch.
   * The runtime reads the root, replaces one path in it and writes it back;
   * an adapter that defers writes without also answering reads from them
   * would start the second such pair from the pre-batch root and drop the
   * first write, producing a root the form never held.
   */
  batch(writes: () => void): void;
}
