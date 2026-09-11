// ===========================================================================
// hand-written-per-field-state-subject.ts — the same behaviour, by hand.
//
// This is the reference the design document's central claim is about: "what
// this design guarantees is that the STORE contributes nothing on top of
// React". That claim is falsifiable without any competitor, by writing the
// same behaviour with no library at all and comparing.
//
// So it is written the way a competent developer would, and not handicapped:
// one useState per leaf, a mutable root the leaves write into, one whole-root
// pass per settled change, and per-path notification through a plain listener
// map. That is deliberately the same POLICY as form-contract, because a
// reference that judged less would make the library look expensive for a
// reason that has nothing to do with the store.
//
// What it does not do is anything the library does beyond that — no
// re-derivation on subscribe, no issue diffing, no participation, no rows. The
// gap between the two rows is the price of those, and that is what it is here
// to price.
// ===========================================================================
import {
  createElement as h,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { readValueAt, writeValueAt } from "form-core";
import { SharedLeaf } from "../shape/shared-leaf.ts";
import { SharedSkeleton, type LeafProps } from "../shape/shared-skeleton.ts";
import { orderDefaults } from "../shape/order-defaults.ts";
import { issuePathToConcretePath } from "../shape/issue-path-to-concrete-path.ts";
import type { MountedSubject, Subject } from "./subject.types.ts";

interface ByHandForm {
  root: unknown;
  readonly listeners: Map<string, Set<() => void>>;
  readonly messages: Map<string, string>;
  schema: { safeParse(root: unknown): unknown };
}

let live: ByHandForm | undefined;

const notify = (form: ByHandForm, path: string): void => {
  const forPath = form.listeners.get(path);
  if (forPath === undefined) return;
  for (const listener of Array.from(forPath)) listener();
};

const judge = (form: ByHandForm): void => {
  const outcome = form.schema.safeParse(form.root) as {
    success: boolean;
    error?: { issues: readonly { path: readonly (string | number)[]; message: string }[] };
  };
  const next = new Map<string, string>();
  if (!outcome.success && outcome.error !== undefined) {
    for (const issue of outcome.error.issues) {
      const path = issuePathToConcretePath(issue.path);
      if (!next.has(path)) next.set(path, issue.message);
    }
  }
  // Only the paths whose message actually moved are woken, which is the same
  // discipline the library applies; a reference that woke everything would be
  // measuring a strawman.
  for (const [path, message] of next) {
    if (form.messages.get(path) !== message) {
      form.messages.set(path, message);
      notify(form, path);
    }
  }
  for (const path of Array.from(form.messages.keys())) {
    if (!next.has(path)) {
      form.messages.delete(path);
      notify(form, path);
    }
  }
};

function Leaf({ path, label }: LeafProps): ReactElement {
  const form = live as ByHandForm;
  const [value, setValue] = useState<string>(() => {
    const held = readValueAt(form.root, path);
    return held === undefined ? "" : String(held);
  });
  const [message, setMessage] = useState<string | undefined>(() =>
    form.messages.get(path)
  );

  useEffect(() => {
    // The listener resyncs BOTH channels. Typing already set the value
    // locally, so that path costs nothing extra; a write that arrives from
    // anywhere else would otherwise never reach the input.
    const listener = (): void => {
      const held = readValueAt(form.root, path);
      setValue(held === undefined ? "" : String(held));
      setMessage(form.messages.get(path));
    };
    let forPath = form.listeners.get(path);
    if (forPath === undefined) {
      forPath = new Set();
      form.listeners.set(path, forPath);
    }
    forPath.add(listener);
    return () => {
      forPath.delete(listener);
    };
  }, [form, path]);

  return h(SharedLeaf, {
    label,
    name: path,
    value,
    onInput: (event) => {
      const next = event.currentTarget.value;
      setValue(next);
      form.root = writeValueAt(form.root, path, next);
      judge(form);
    },
    onBlur: () => undefined,
    invalid: message !== undefined,
    message,
  });
}

export const handWrittenPerFieldStateSubject: Subject = {
  id: "hand-written-per-field-state",
  library: "(none)",
  treeClass: "equal-tree",
  policy: "on-change",
  capabilities: ["cross-field-error-on-other-path"],
  notes:
    "One useState per leaf, a mutable root, one whole-root pass per change, " +
    "per-path notification. No store, no library.",
  policyCitation: "written for this benchmark to judge on every change",
  Leaf,

  mount(container, schema, paths) {
    live = {
      root: orderDefaults(),
      listeners: new Map(),
      messages: new Map(),
      schema: schema as ByHandForm["schema"],
    };
    const form = live;
    const root: Root = createRoot(container);
    root.render(h(SharedSkeleton, { Leaf, paths }));

    const mounted: MountedSubject = {
      setValue: (path, value) => {
        form.root = writeValueAt(form.root, path, value);
        notify(form, path);
        judge(form);
      },
      readValue: (path) => readValueAt(form.root, path),
      submit: async () => {
        judge(form);
      },
      unmount: () => root.unmount(),
    };
    return mounted;
  },
};
