// What a store written from scratch looks like, and what the conformance kit
// does to one that is written carelessly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFormStoreContract } from "form-core";

/**
 * The smallest store that satisfies the contract. No dependencies, no shared
 * helpers from the library — this is the whole thing.
 */
function createMinimalCellStore() {
  const cells = new Map();
  const listeners = new Map();
  const changed = new Set();
  let depth = 0;

  const notify = (key) => {
    const forKey = listeners.get(key);
    if (forKey === undefined) return;
    // A copy: a listener that unsubscribes while being notified would
    // otherwise make the iterator skip whichever listener followed it.
    for (const listener of Array.from(forKey)) listener();
  };

  const settle = (key) => {
    if (depth === 0) notify(key);
    else changed.add(key);
  };

  return {
    read: (key) => cells.get(key),

    write(key, next) {
      // The equality gate. Without it every write wakes its readers whether or
      // not anything moved.
      if (cells.has(key) && Object.is(cells.get(key), next)) return;
      cells.set(key, next);
      settle(key);
    },

    forget(key) {
      if (cells.delete(key)) settle(key);
    },

    subscribe(key, listener) {
      let forKey = listeners.get(key);
      if (forKey === undefined) {
        forKey = new Set();
        listeners.set(key, forKey);
      }
      forKey.add(listener);
      return () => forKey.delete(listener);
    },

    batch(writes) {
      depth += 1;
      try {
        writes();
      } finally {
        depth -= 1;
        if (depth === 0) {
          const flushing = Array.from(changed);
          changed.clear();
          for (const key of flushing) notify(key);
        }
      }
    },
  };
}

/**
 * The store somebody writes when they have not read the contract: one listener
 * list, no equality gate, no batching. Every member is present and every type
 * is satisfied, and it is not substitutable.
 */
function createBroadcastCellStore() {
  const cells = new Map();
  const everyone = new Set();
  const tellEveryone = () => {
    for (const listener of Array.from(everyone)) listener();
  };
  return {
    read: (key) => cells.get(key),
    write(key, next) {
      cells.set(key, next);
      tellEveryone();
    },
    forget(key) {
      cells.delete(key);
      tellEveryone();
    },
    subscribe(_key, listener) {
      everyone.add(listener);
      return () => everyone.delete(listener);
    },
    batch(writes) {
      writes();
    },
  };
}

const runKit = (build) => {
  const failures = [];
  assertFormStoreContract(build, (holds, what) => {
    if (!holds) failures.push(what);
  });
  return failures;
};

test("a store written from scratch satisfies the contract", () => {
  assert.deepEqual(runKit(createMinimalCellStore), []);
});

test("the kit names exactly what a broadcast store gets wrong", () => {
  const failures = runKit(createBroadcastCellStore);
  assert.ok(failures.length > 0, "a broadcast store is not substitutable");
  assert.deepEqual(new Set(failures), new Set([
    "an Object.is-equal write notifies nobody",
    "a write to one key never reaches a listener on another",
    "batch notifies once per changed key, before it returns",
    "a nested batch collapses into the outermost",
  ]));
});
