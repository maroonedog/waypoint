// ===========================================================================
// recording-store.ts — the shipped store, with a tape running.
//
// "The behaviour is hard to see" is the fair complaint about every form
// library's demo: a value goes in, something happens, a message appears, and
// the reader is asked to believe a description of the middle. This writes the
// middle down.
//
// It is not an instrumentation hook, because there is no instrumentation hook.
// `createForm` takes a store, and a store is five members over an opaque key,
// so a recording store is an ordinary substitution — the same seam an
// application uses to put a form in zustand. The demo that explains the
// runtime is therefore also a demonstration of the one extension point the
// contract has.
//
// Reads are NOT recorded. A read happens on every render of every subscriber
// and would bury the writes, which are what a reader is trying to see.
//
// And the tape starts STOPPED. Building a form writes every leaf, the row
// order and the four form flags — around fourteen cells, which is the whole
// panel — and that is not the movement a reader came to watch. The demo turns
// it on after mount, so the first line on the tape is one the reader caused.
// ===========================================================================
import { createCellStore } from "@maroonedog/form-contract/core";
import type { CellKey, FormCellStore } from "@maroonedog/form-contract/core";

export interface Entry {
  readonly seq: number;
  /** The channel, which is the part of a key that says what it holds. */
  readonly channel: string;
  readonly path: string;
  readonly what: string;
  readonly kind: "value" | "issues" | "flag" | "form" | "rows" | "forget";
}

export interface Tape {
  readonly store: FormCellStore;
  subscribe(listener: () => void): () => void;
  read(): readonly Entry[];
  /** Begins recording. Writes before this are the form being built. */
  startRecording(): void;
  clear(): void;
}

const CHANNEL_KIND: Readonly<Record<string, Entry["kind"]>> = {
  value: "value",
  issues: "issues",
  touched: "flag",
  dirty: "flag",
  participating: "flag",
  rows: "rows",
  form: "form",
  root: "form",
};

/** `issues:owner.name` -> ["issues", "owner.name"]. The path may contain colons. */
const split = (key: string): readonly [string, string] => {
  const at = key.indexOf(":");
  return at === -1 ? ["", key] : [key.slice(0, at), key.slice(at + 1)];
};

const describe = (channel: string, value: unknown): string => {
  if (channel === "issues") {
    const issues = value as readonly { readonly message?: string }[] | undefined;
    if (issues === undefined || issues.length === 0) return "cleared";
    return issues.map((one) => one.message ?? "?").join(" · ");
  }
  if (channel === "rows") {
    return `${(value as readonly string[] | undefined)?.length ?? 0} rows`;
  }
  if (channel === "root") return "replaced";
  if (value === undefined) return "undefined";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : "{…}";
  return JSON.stringify(value);
};

/** Kept short: a tape a reader has to scroll is a tape nobody reads. */
const KEEP = 14;

export function createRecordingStore(): Tape {
  const inner = createCellStore();
  const listeners = new Set<() => void>();
  let entries: readonly Entry[] = [];
  let seq = 0;
  let isRecording = false;

  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const record = (channel: string, path: string, what: string, kind: Entry["kind"]): void => {
    if (!isRecording) return;
    seq += 1;
    entries = [{ seq, channel, path, what, kind }, ...entries].slice(0, KEEP);
    // Announced on a microtask so a render is never started from inside the
    // runtime's own batch — the same reason the pass counter defers.
    void Promise.resolve().then(announce);
  };

  const store: FormCellStore = {
    read: inner.read,
    write<T>(key: CellKey<T>, next: T): void {
      const held = inner.read(key);
      inner.write(key, next);
      // The store gates an Object.is-equal write and notifies nobody, so the
      // tape must not claim something happened either.
      if (Object.is(held, next)) return;
      const [channel, path] = split(key);
      // The root key carries no path of its own, so it is named rather than
      // left as a blank column.
      record(
        channel,
        path === "" ? "(whole form)" : path,
        describe(channel, next),
        CHANNEL_KIND[channel] ?? "form"
      );
    },
    forget(key: CellKey<unknown>): void {
      // A splice forgets every channel of every path it touched, and most of
      // those cells were never written — a leaf has no row order. Recording
      // them would fill the panel with cells that never existed, so a forget
      // is a line on the tape only when something was actually there.
      const held = inner.read(key);
      inner.forget(key);
      if (held === undefined) return;
      const [channel, path] = split(key);
      record(channel, path === "" ? "(whole form)" : path, "forgotten", "forget");
    },
    subscribe: inner.subscribe,
    batch: inner.batch,
  };

  return {
    store,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read: () => entries,
    startRecording() {
      isRecording = true;
    },
    clear() {
      entries = [];
      announce();
    },
  };
}
