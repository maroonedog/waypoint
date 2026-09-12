Verified against source before writing: `rememberDeclaredCalls` runs unconditionally at `create-field-builder.ts:43` but stores `calls: null` per field unless a recorder was installed first (`chain/declaration-recorder.port.ts` — `declarationRecorder` starts `null`), the only installer is a module-scope side effect of `standard-schema/to-standard-json-schema.ts`, `readDeclaredCalls` reaches no barrel, and `package.json` has 88 explicit subpaths with no wildcard and `"sideEffects": false`.

---

# Cells — the final architecture

> **Two things below did not survive contact with the implementation.** The
> architecture did; these two did not, and they are left in place rather than
> quietly edited so the reasons stay readable.
>
> **`<FieldScope>` was removed.** A scope rewrote EVERY path beneath it with no
> way out: a component inside `prefix="billing"` asking for
> `shipping.postcode` silently got `billing.shipping.postcode` and rendered
> nothing. A row now carries its own address (`row.path` is `items[2]`) and a
> section is told where it is by an ordinary prop, which cannot do that to
> anybody. `setParticipating` moved onto the field handle and `useParticipation`.
>
> **`check(candidate)` is now `issuesFor(candidate)`.** The name had to be
> read with its comment to know that it returns issues and writes nothing,
> which the naming rule in CLAUDE.md does not allow.
>
> **`useField` is no longer spelled `useField<string>(path)`.** The path type
> comes from a module-augmentation registry the application declares once, so
> both the path and the value type are checked rather than asserted. See the
> README section "The path a hook is allowed to ask for".

## 1. The decision

The runtime is a **flat, path-keyed cell space that lives outside React, plus one whole-root validation pass per settled change whose results are scattered back into per-path issue cells, writing only where the content actually differs.** The primitive is a **cell**: an opaque string key holding one `Object.is`-comparable value with its own listener set. A field's value, its issue list, its touched flag, its dirty flag, its participation flag, an array's row-key order, and the form's aggregates are all cells that differ only by the channel prefix in their key; the store never parses a key and knows nothing about paths, fields, arrays or validation. Every cell exists from `createForm`, seeded from the descriptors, so **mounting is a subscription and nothing else** — it creates no value, seeds no default, registers no field, and unmounting destroys nothing. Reactivity is one `useSyncExternalStore` per subscribed cell over a reader that returns a primitive or a value the runtime interned, so there is no selector, no equality function, no `useSyncExternalStoreWithSelector`, and no read-tracking. There is no reactive graph of our own, no tracking Proxy, no dependency index, and no second DSL: the only thing this library owns is where values live, and that is invisible from inside a children function.

Every judge across all four designs converged on the same two ideas, and they are the load-bearing ones here: **one `validateRoot` per coalesced flush with a per-concrete-path issue diff** (the only mechanism that delivers a cross-field error onto the *other* field's path without a dependency map — and Luq's `requiredIf`/`validateIf` carry an opaque `RootPredicate`, so no sound dependency map exists), and **cells seeded before mount, never pruned on unmount, never consulting the DOM or React tree position** (which makes lazily mounted, conditionally rendered and portaled fields stop being cases at all).

---

## 2. The public store contract

Five members over an opaque key. The store is the swappable half; everything that needs to know what a path *means* — array renumbering, ancestor/descendant fan-out, issue routing — is runtime code written against these five, so substituting a store is never a port.

```ts
// ===========================================================================
// packages/form-core/src/store/form-cell-store.types.ts
// ===========================================================================

declare const CELL_VALUE: unique symbol;

/**
 * A cell name that remembers what the cell holds. The phantom sits in a return
 * position, so CellKey<string> is assignable to CellKey<unknown> — which is
 * what `subscribe` and `read` need. Keys are minted only by cell-key.ts; that
 * file holds the one cast in the package.
 */
export type CellKey<out T> = string & { readonly [CELL_VALUE]: () => T };

/** Takes no argument: the reader pulls with `read`. */
export type CellListener = () => void;

/** Idempotent — StrictMode runs the teardown of an effect it is about to rerun. */
export type CellUnsubscribe = () => void;

export interface FormCellStore {
  /**
   * The value last written, or undefined when nothing was.
   *
   * WHY: R2 lives here. A cross-field rule reads a sibling whose component has
   * never mounted, so a read must answer for a key with no subscriber and no
   * component. A store that materialises state on subscription cannot back
   * this form. It must also answer identically on the server given the same
   * seeding, because it is passed as useSyncExternalStore's third argument.
   */
  read<T>(key: CellKey<T>): T | undefined;

  /**
   * Replaces the value and notifies that key's listeners.
   *
   * WHY the Object.is rule is in the contract and not left to the caller: a
   * write whose value is Object.is-equal to the current one must not notify.
   * A consumer that has to defend itself against no-op notifications runs a
   * comparison per subscriber per write, which is the cost model this contract
   * exists to avoid.
   *
   * WHY per-key routing is normative: a write to K notifies the listeners of K
   * and of no other key. A store that can only broadcast satisfies the types
   * and fails the requirement; assert-form-store-contract.ts checks it
   * directly, so nobody ships a broadcast adapter by accident.
   *
   * WHY it must be synchronous: React re-asserts a controlled input's
   * props.value onto the DOM node from the fiber's committed props at the end
   * of the event flush. A store that defers notification to a microtask drops
   * the typed character. Valtio must therefore be adapted with notifyInSync.
   */
  write<T>(key: CellKey<T>, next: T): void;

  /**
   * Removes the cell. Listeners are notified once; a later read returns
   * undefined.
   *
   * WHY it exists: array cells are keyed by concrete index, so shrinking
   * `items` from six rows to five orphans every cell under `items[5]`. Without
   * reclamation a data grid that churns rows leaks cells and closures without
   * bound. A judge killed an earlier four-member version of this contract for
   * exactly that, and adding the member later would break every adapter.
   */
  forget(key: CellKey<unknown>): void;

  /**
   * WHY the listener takes no argument: it is the lowest common denominator
   * across every store surveyed (Redux 5 narrowed to exactly this) and it is
   * precisely what useSyncExternalStore wants. Any payload is a shape every
   * adapter must translate, and pull-on-notify costs nothing because `read`
   * already exists.
   *
   * WHY subscribe/unsubscribe/subscribe must be lossless: StrictMode
   * double-invokes effects, and a notification landing in the gap would leave
   * a stale screen with no symptom.
   */
  subscribe(key: CellKey<unknown>, listener: CellListener): CellUnsubscribe;

  /**
   * Runs `writes`, then notifies once per key that actually changed, before
   * returning. Nested calls collapse into the outermost.
   *
   * WHY: one user action is routinely many writes. A row insert rewrites the
   * row order and every cell at or after the splice point; a validation pass
   * rewrites every issue cell that changed. Outside a React event handler each
   * notification would otherwise schedule its own synchronous render.
   */
  batch(writes: () => void): void;
}
```

Channels and key minting — the one file that decides the spelling, and the one file that casts:

```ts
// packages/form-core/src/store/cell-key.ts
export type CellChannel =
  | "value" | "issues" | "touched" | "dirty" | "participating" | "rows" | "form";

export const ROOT_CELL = "root:" as CellKey<unknown>;

export function valueCell(path: string): CellKey<unknown> { return `value:${path}` as CellKey<unknown>; }
export function issuesCell(path: string): CellKey<readonly FormIssue[]> { return `issues:${path}` as CellKey<readonly FormIssue[]>; }
export function touchedCell(path: string): CellKey<boolean> { return `touched:${path}` as CellKey<boolean>; }
export function dirtyCell(path: string): CellKey<boolean> { return `dirty:${path}` as CellKey<boolean>; }
export function participatingCell(path: string): CellKey<boolean> { return `participating:${path}` as CellKey<boolean>; }
/** The row-key ORDER of an array, not its values. Changes on insert, remove
 *  and move; never when a row member is edited. */
export function rowsCell(arrayPath: string): CellKey<readonly string[]> { return `rows:${arrayPath}` as CellKey<readonly string[]>; }
export function formCell(name: "errorCount" | "submitting" | "submitCount" | "validating"): CellKey<number | boolean> { … }
```

Value and issues are **separate cells on purpose**: a component that displays only an error never wakes on a keystroke, and bundling them into one snapshot object re-introduces the identity problem that `useSyncExternalStoreWithSelector` exists to paper over.

### The shipped store

```ts
// packages/form-core/src/store/create-cell-store.ts
export function createCellStore(seed?: ReadonlyMap<string, unknown>): FormCellStore {
  const cells = new Map<string, unknown>(seed);
  const listeners = createCellListenerIndex();
  const changed = new Set<string>();
  let depth = 0;

  return {
    read: (key) => cells.get(key) as never,
    write(key, next) {
      if (cells.has(key) && Object.is(cells.get(key), next)) return;
      cells.set(key, next);
      if (depth === 0) { listeners.notify(key); return; }
      changed.add(key);
    },
    forget(key) {
      if (!cells.delete(key)) return;
      if (depth === 0) { listeners.notify(key); return; }
      changed.add(key);
    },
    subscribe: (key, listener) => listeners.add(key, listener),
    batch(writes) {
      depth += 1;
      try { writes(); }
      finally {
        depth -= 1;
        if (depth > 0) return;
        const flushing = Array.from(changed);
        changed.clear();
        for (const key of flushing) listeners.notify(key);
      }
    },
  };
}
```

### The worked third-party adapter — Zustand, and why it is correct

An earlier design's Zustand adapter notified its own router from inside `write()` and never called `api.subscribe`. A judge killed it: devtools time-travel, `persist` rehydration and the host app's own `api.setState` change Zustand and notify nobody, leaving every `useSyncExternalStore` snapshot stale and the DOM torn — which falsifies the one reason anyone wants R3. This version subscribes once and diffs.

```ts
// packages/form-store-zustand/src/create-zustand-cell-store.ts
import type { StoreApi } from "zustand/vanilla";

/**
 * Values live in Zustand, so devtools, persist and time travel keep working
 * against the real form state. Zustand has one listener Set, so per-key
 * routing is supplied by the shared listener index; the honest price is that
 * every write costs one Object.is per OBSERVED key, not O(1). A store that
 * cannot route per key cannot buy that back, and the contract says so.
 */
export function createZustandCellStore(
  api: StoreApi<Record<string, unknown>>
): FormCellStore {
  const listeners = createCellListenerIndex();
  let staged: Record<string, unknown> | null = null;

  // ONE subscription. Every change reaches here, including the ones we did not
  // make. Diffing only the observed keys is what keeps a foreign write visible
  // to React instead of tearing silently.
  api.subscribe((next, previous) => {
    listeners.forEachObservedKey((key) => {
      if (!Object.is(next[key], previous[key])) listeners.notify(key);
    });
  });

  return {
    read: (key) => api.getState()[key] as never,
    // No manual notify and no equality gate here: setState notifies
    // synchronously and the diff above is the gate. An equal write reaches
    // nobody, which is exactly what the contract demands.
    write(key, next) {
      if (staged !== null) { staged[key] = next; return; }
      api.setState({ [key]: next });
    },
    forget(key) {
      api.setState((state) => {
        const rest = { ...state };
        delete rest[key];
        return rest;
      }, true);
    },
    subscribe: (key, listener) => listeners.add(key, listener),
    batch(writes) {
      if (staged !== null) { writes(); return; }
      staged = {};
      try { writes(); }
      finally {
        const pending = staged;
        staged = null;
        if (Object.keys(pending).length > 0) api.setState(pending);
      }
    },
  };
}
```

Valtio, `@tanstack/store` and `@preact/signals-core` are the same shape and shorter: the last two already route per key, so `createCellListenerIndex` is not needed at all. Redux is `write` = `dispatch`, `read` = `getState()[key]`, plus the index. **`createForm({ store })` accepts any of them and the shipped store is not privileged.**

### The contract is executable

```ts
// packages/form-core/src/store/assert-form-store-contract.ts
export type StoreContractExpect = (held: boolean, what: string) => void;

/** An adapter author runs this. A store that passes it is substitutable; one
 *  that does not is not, whatever its types say. Without it, "per-key
 *  notification" is a sentence in a doc comment and every adapter quietly
 *  degrades to broadcast. */
export function assertFormStoreContract(
  createStore: () => FormCellStore,
  expect: StoreContractExpect
): void;
```

It asserts: read of an unwritten key is `undefined`; an `Object.is`-equal write notifies nobody; a write to `a` never reaches a listener on `b`; `batch` notifies once per changed key, after the callback and before `batch` returns; nested `batch` collapses; unsubscribing during notification does not skip a sibling listener; resubscribe after unsubscribe still receives the next write; `forget` notifies once and a later read is `undefined`; and notification is synchronous.

---

## 3. The reactivity mechanism

One keystroke in `billing.postcode`, end to end.

**1 — the write.** `field.setValue("100")` calls a closure cached on the field handle (`field-handle-cache.ts` keys handles by concrete path, so `setValue`, `markTouched` and the handle's `subscribe`/`read` pairs all keep their identity across every render of every component).

**2 — fan-out, synchronously, inside one `store.batch`.** `fan-out-write.ts` writes: the new root into `ROOT_CELL` (copy-on-write via `write-value-at.ts`, which uses `Object.defineProperty` rather than assignment so a key literally named `__proto__` is safe); `valueCell("billing.postcode")`; `dirtyCell(...)` if the flag flips; and `valueCell(p)` for every **live** ancestor and descendant of the written path, matched segment-anchored — never `startsWith`, which is what makes RHF's subscriber on `"a"` match a signal for `"abc"`. A leaf edit with no container on screen touches three cells.

**3 — notification.** The batch closes and drains its changed set. `value:billing.postcode` holds exactly one listener: the `useSyncExternalStore` callback of the one component that owns that `<input>`. Nothing else is invoked — not invoked and filtered (RHF's two predicates per subscriber), not recomputed and identity-gated (TanStack's every-field derived atom). **Work is O(cells that changed), not O(mounted fields).**

**4 — the React API.** `use-cell.ts` is the only `useSyncExternalStore` call site in the package:

```ts
export function useCell<T>(runtime: FormRuntime, key: CellKey<T>): T {
  const source = runtime.cellSource(key);            // memoised per key, identity-stable
  return useSyncExternalStore(source.subscribe, source.read, source.read);
}
```

`source.read` returns the raw cell value with an **interned** default applied (`no-issues.ts` holds one module-level `Object.freeze([])` for issues, one for rows, `false` for the flags, `0` for the counters). Three consequences, each closing a trap a judge found in an earlier design: `getSnapshot` is never a fresh object, so the "result of getSnapshot should be cached" infinite loop cannot occur; `field.issues.length` cannot throw on a never-validated field; and `source.subscribe` is identity-stable, so the passive effect keyed on `[subscribe]` never re-subscribes. **The third argument is always passed** — omitting it makes React throw outright on server-rendered content.

The runtime's own rule, enforced by review: **a reader never builds a value.** Aggregates are separate cells read separately (`useFormStatus` calls `useCell` four times and composes the object in the component body, where a fresh object is harmless); there is no `readFormState()` returning `{isSubmitting, submitCount, errorCount}`, because used as a `getSnapshot` that is the loop again.

**5 — the render.** React marks that fiber, ORs `childLanes` up the ancestor chain, and descends from the root; every ancestor takes the `childLanes` bail-out without its function being invoked. Exactly one component function runs, inside the same event flush, which is the only way a controlled input keeps its keystroke.

**6 — validation, one microtask later.** `schedule-validation.ts` coalesces every write in the handler into one pass, tagged with a monotonic pass id (a result older than the last committed one is discarded). It calls `port.validateRoot(store.read(ROOT_CELL), external)` **once**. There is no dependency index and no per-field run: `create-field-validator.ts` shows `pick()` runs the whole plan with `abortEarly: false` and filters by `matchPathPattern`, so N per-field runs cost N× one form run and produce strictly less information. A judge killed a design for exactly that inversion.

**7 — the diff.** `group-issues-by-path.ts` groups by concrete path; `same-issue-list.ts` compares length then `code`/`message`/`severity`/`path` per element; `distribute-issues.ts` writes `issuesCell(p)` only where the content differs, for every path that has issues now **or had them before**, all inside one `store.batch`. So a whole-form run that judges 400 fields wakes only the fields whose errors moved. **Compute is O(schema); notification is O(paths whose issues changed).** React 18+ auto-batches microtask updates, so the pass produces at most one additional render.

**Tearing.** `getSnapshot` is `Object.is`-stable by construction, so `checkIfSnapshotChanged` is meaningful; `subscribe` never changes identity, so the subscription is installed once; the render↔commit gap is closed by React's own `updateStoreInstance` passive effect, which re-reads and calls `forceStoreRerender` if the value moved; and for non-blocking lanes React pushes a consistency record and, on mismatch after a concurrent render, throws that render away and redoes the root synchronously. Per-key subscriptions make that rare. They do not make it cheap, and it is a whole-root cost — see §7.

---

## 4. The three layers

All three are the same primitive at three heights. Layer 1 is layer 2 with the default widget table; layer 2 is layer 3 with a widget as the children function. There is no second implementation to diverge.

```tsx
// ===========================================================================
// One form, all three layers.
// ===========================================================================
import {
  AutoForm, Field, FieldRows, FieldScope, FormProvider,
  useCreateForm, useField, useFieldIssues, useFormStatus,
} from "form-contract-react";
import { luqResolver } from "@maroonedog/luq/form";

interface Order {
  owner: { name: string; email: string };
  billing: { postcode: string };
  shipping: { postcode: string };
  items: { sku: string; quantity: number }[];
}

export function OrderScreen(): ReactElement {
  // Created per component instance, never at module scope: on the server a
  // module-scope runtime is one mutable cell space shared by concurrent
  // requests. useCreateForm holds it in a useState initialiser.
  const form = useCreateForm<Order>(() => ({
    resolver: luqResolver(orderValidator),              // carries T and its paths
    defaultValues: { items: [] },
    validateOn: "change",
  }));

  return (
    <FormProvider form={form} widgets={widgets}>
      {/* LAYER 1 — every descriptor drawn, nothing named. */}
      <AutoForm only={["owner"]} />

      {/* LAYER 2 — a widget named per field. Same component, no children. */}
      <Field path="billing.postcode" as="postcode" />

      {/* LAYER 3 — plain React. No dependency array, no selector, no memo. */}
      <Field<string> path="shipping.postcode">
        {(field) => (
          <label className="my-own-class">
            <span>Shipping postcode</span>
            <input
              {...field.inputProps}
              aria-invalid={field.isTouched && field.issues.length > 0}
            />
            {field.isTouched
              ? field.issues.map((issue) => <em key={issue.code}>{issue.message}</em>)
              : null}
          </label>
        )}
      </Field>

      <ItemRows />
      <SubmitButton />
    </FormProvider>
  );
}

// A reusable group authored against LOCAL names, bound where it is placed.
// This is TanStack's FieldGroupApi remapping, which is the only mechanism in
// either prior-art library that makes a genuinely location-independent group.
// AS SHIPPED: the group is told where it is, and the prop's type is the set of
// places the group fits — computed from the registered form, not listed here.
function PostcodeInput({ at }: { at: FormPathOver<"postcode"> }): ReactElement {
  const field = useField(`${at}.postcode`);
  return <input {...field.inputProps} />;
}
const Addresses = () => (
  <>
    <PostcodeInput at="billing" />
    <PostcodeInput at="shipping" />
  </>
);

// A component that shows only errors subscribes only to the issues channel,
// so typing in the input above never re-renders it.
const EmailErrors = () => {
  const issues = useFieldIssues("owner.email");
  return <ul>{issues.map((i) => <li key={i.code}>{i.message}</li>)}</ul>;
};

// Rows: React keys are opaque row ids, cell keys are concrete indices.
function ItemRows(): ReactElement {
  return (
    <FieldRows path="items">
      {({ rows, insert, remove }) => (
        <>
          {rows.map((row) => (
            // FieldScope supplies the index; nothing inside spells "items[3]".
            <FieldScope key={row.key} row={row}>
              <Field<number> path="items[*].quantity">
                {(field) => <input type="number" {...field.inputProps} />}
              </Field>
              <button type="button" onClick={() => remove(row.index)}>Remove</button>
            </FieldScope>
          ))}
          <button type="button" onClick={() => insert(rows.length)}>Add</button>
        </>
      )}
    </FieldRows>
  );
}

function SubmitButton(): ReactElement {
  const { errorCount, isSubmitting } = useFormStatus();   // four cells, four hooks
  return <button type="submit" disabled={errorCount > 0 || isSubmitting}>Place order</button>;
}
```

The binding a children function and a widget both receive:

```ts
// packages/form-react/src/field-binding.types.ts
export interface FieldBinding<TValue> {
  readonly path: string;               // concrete: "items[3].quantity"
  readonly declaredPath: string;       // "items[*].quantity"
  readonly descriptor: FormFieldDescriptor;
  readonly value: TValue | undefined;
  readonly issues: readonly FormIssue[];   // never undefined; interned when empty
  readonly isTouched: boolean;
  readonly isDirty: boolean;
  readonly isParticipating: boolean;
  setValue(next: TValue | undefined): void;
  markTouched(): void;
  /** Presentation and data are separate axes; see §5. */
  setParticipating(participating: boolean): void;
  validate(): readonly FormIssue[];
  /** Judges a value that is NOT in the store and writes nothing. */
  check(candidate: unknown): readonly FormIssue[];
  /** Offered, never required — the layer-3 example above spells its own
   *  attributes off `descriptor.constraints` if it prefers. */
  readonly inputProps: FieldInputProps;
}

export interface FieldInputProps {
  readonly name: string;
  readonly value: string | number;
  /** A real React event, not a narrowed { target: { value } } shape: narrowing
   *  it removes nativeEvent.isComposing and makes IME unhandleable. */
  onChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void;
  onBlur(): void;
  onCompositionStart(): void;
  onCompositionEnd(event: CompositionEvent<HTMLElement>): void;
  readonly required: boolean;
  readonly min?: number; readonly max?: number;
  readonly minLength?: number; readonly maxLength?: number;
  readonly step?: number; readonly pattern?: string;
}
```

**IME.** The store write is unconditional on every change event — a controlled input that skips a write during composition diverges from the store. What is suppressed while composing is **value coercion**: `build-input-props.ts` tracks composition and the runtime defers any normalize/transform of the value until `compositionend`. Transforming mid-composition is what actually breaks Japanese input, and it is the only part that can be deferred safely.

**Widgets ship behind a separate entry point** (`form-contract-react/widgets`). `auto-form.tsx` imports zero widgets: the component set arrives as a prop or from `FormProvider`, so an app that only uses layer 3 never bundles an `<input>` this library authored. No CSS ships and no class names ship.

**Layer 1 can draw arrays.** The zod resolver states plainly that "a container contributes no descriptor of its own", so `fields` for `Order` is leaves only, with no `items` entry — which is why an earlier design's flagship `<AutoForm />` example did not run. `build-descriptor-tree.ts` derives the container structure from the `[*]` and `.` prefixes of the leaf paths and hands `AutoForm` a tree whose array nodes render a `<FieldRows>`. Array-level issues (`arrayMinLength`) report at path `items`, which has no descriptor; the tree carries a container node for it and `useFieldIssues("items")` reads them.

---

## 5. A field in a separate, lazily mounted component

`billing.postcode` is in `<BillingSection>`, rendered through `createPortal` into `document.body`. `shipping.postcode` is in `<ShippingSection>`, behind `React.lazy`, not mounted. The rule is `.compareField("shipping.postcode")` declared on `billing.postcode`, plus `.requiredIf(root => root.needsShipping)` on `shipping.postcode` — an opaque `RootPredicate` whose dependency set is undecidable.

**Before anything mounts.** `createForm` calls the resolver once and `seed-root-value.ts` builds the complete root from `defaultValues` plus one entry per descriptor plus `[]` per array container. `ROOT_CELL` and one `valueCell` per declared wildcard-free path are written before the first render. `value:shipping.postcode` is authoritative from the first tick with no component anywhere near it. This is the one policy that makes R2 fall out for free, and it is three lines.

**Mounting.** `<BillingSection>` resolves and renders `<Field path="billing.postcode">`. `useField` opens four subscriptions on four existing cells. It does not register, does not seed, does not reset, and does not trigger a catch-up validation; the input paints with the right value and the right error on its first frame. Unmount cancels four subscriptions and touches no value. There is **no `shouldUnregister`, no ref callback, no `isConnected` check, and no React-tree inspection anywhere in the runtime** — a portal, a lazy chunk and a conditional branch are the same case, because none of them is a case.

**Validating the field on its own.**

```ts
// packages/form-core/src/runtime/create-field-handle.ts (the two methods)
validate(): readonly FormIssue[] {
  const produced = port.validateRoot(store.read(ROOT_CELL), external);
  distributeIssues(produced);              // the whole map is written back
  return produced.filter((issue) => issue.path === concretePath);
},
check(candidate: unknown): readonly FormIssue[] {
  const probe = writeValueAt(store.read(ROOT_CELL), concretePath, candidate);
  return port.validateRoot(probe, external)
    .filter((issue) => issue.path === concretePath);   // writes nothing
},
```

There is **one validation code path**, and that is a correctness argument, not a simplification. RHF's built-in rules skip unmounted fields (`validateField.ts:57`) while its resolver does not; TanStack's field-level validators vanish with the instance while its form-level validators still judge the path. Both libraries therefore change the meaning of every conditionally rendered field depending on which engine produced the error. Here the field's answer and the form's answer are the same computation.

It is also **strictly more correct than `pick()` for an array element**: `pick("items[*].quantity")` composes its subject as `{ items: [value] }` and top-level-spreads it over the siblings, so index 3 becomes 0, `ArrayItemContext.array.length` becomes 1, and every same-element sibling is destroyed. Filtering a real root gives the real index, the real length and real siblings. And it costs no more than `pick()`, which runs the whole plan anyway.

**The unmounted sibling.** `port.validateRoot` is handed `store.read(ROOT_CELL)` — the complete root. `compareField`'s reader was compiled at `build()` against the absolute path `shipping.postcode` and reads `RuleContext.root`, so it gets the real value whether or not `<ShippingSection>` has ever resolved. `requiredIf`'s opaque predicate receives the same complete root. No Proxy, no marker table, no static extraction, and no cooperation from the plugin.

**The other direction.** The user then edits shipping. One `validateRoot` produces the complete issue list; the diff writes `issues:billing.postcode` because `compareField`'s verdict moved, and writes nothing else. Billing re-renders; shipping does not, because its own issue slice is unchanged. **A cross-field error lands on the *other* field's path with no `deps` array, no `onChangeListenTo`, and no dependents list to prune** — which is where RHF (`!mount` guard) and TanStack (`if (!field.instance) continue`) both silently drop the cascade.

**`<ShippingSection>` mounts later.** Its issue cell is already correct, so the error is on screen on the first paint.

**Off-screen errors that block submit.** `participatingCell(path)` defaults to `true`, and `<FieldScope prefix="shipping" participating={false}>` (or `field.setParticipating(false)`) routes that subtree's issues out of the blocking set: `distribute-issues.ts` writes `NO_ISSUES` to a dormant field's cell and `errorCount` counts only participating issues, while the values stay in the store and keep feeding cross-field rules. `form.submit()` returns `{ submitted: false, blockedBy }` listing every blocking issue including paths with no component, and `blockedBy` carries the declared path so the app can open the right accordion. This is the axis both prior-art libraries lack: `shouldUnregister` conflates *not rendered* with *the value should not exist*, and the result in both is a blocking, unfocusable error on a path nobody can see.

---

## 6. Module layout

### `packages/form-core` — vendor-neutral, no React, no Luq

| File | Single responsibility |
|---|---|
| `store/form-cell-store.types.ts` | The five-member contract and its normative rules |
| `store/cell-key.ts` | The channel union and the one key minter (the package's only cast) |
| `store/cell-listener-index.ts` | Per-key listener sets; `add`, `notify`, `forEachObservedKey` |
| `store/create-cell-store.ts` | The shipped store: a Map over the listener index |
| `store/store-contract-cases.ts` | The conformance cases, as data |
| `store/assert-form-store-contract.ts` | Runs the cases against a candidate store |
| `path/concrete-path.ts` | The concrete grammar alone: split, join, one segment type |
| `path/bind-declared-path.ts` | Declared path + one index per `[*]` → concrete path |
| `path/declared-path-of.ts` | Concrete → declared (`items[3].q` → `items[*].q`) |
| `path/match-declared-path.ts` | Does a concrete path belong to a declared one; scans, no RegExp |
| `path/path-relation.ts` | Segment-anchored ancestor/descendant tests |
| `path/read-value-at.ts` | Own-property read along a concrete path |
| `path/write-value-at.ts` | Copy-on-write write; `defineProperty`, never assignment |
| `descriptors/descriptor-index.ts` | Descriptors by declared path; lookup from a concrete path |
| `descriptors/descriptor-tree.types.ts` | The tree a layer-1 renderer walks |
| `descriptors/build-descriptor-tree.ts` | Leaf descriptors → containers derived from `[*]` and `.` prefixes |
| `descriptors/seed-root-value.ts` | `defaultValues` + descriptors → the complete initial root |
| `runtime/form-issue.types.ts` | `FormIssue`, vendor-independent |
| `runtime/form-validation-port.types.ts` | The validator seam (three members, one required) |
| `runtime/interned-defaults.ts` | The frozen empty issue list, empty row list, `false`, `0` |
| `runtime/cell-source.ts` | `{subscribe, read}` per key, memoised, default-applying |
| `runtime/open-value-cells.ts` | The registry of live value-cell paths |
| `runtime/fan-out-write.ts` | One leaf write → root + leaf + live ancestors/descendants |
| `runtime/group-issues-by-path.ts` | Issue list → `Map<concretePath, issues>` |
| `runtime/same-issue-list.ts` | Content equality that keeps an issue cell `Object.is`-stable |
| `runtime/distribute-issues.ts` | Writes only changed issue cells; honours participation |
| `runtime/participation-index.ts` | Which subtrees currently report issues |
| `runtime/schedule-validation.ts` | Microtask coalescing, pass id, the `validateOn` policy |
| `runtime/row-index.ts` | Opaque row ids per array path; insert, remove, move |
| `runtime/create-rows-handle.ts` | `RowsHandle`: the row list and the three structural edits |
| `runtime/splice-row-cells.ts` | Rewrites and forgets the cells a splice renumbers |
| `runtime/create-field-handle.ts` | One field's reads, writes, `validate` and `check` |
| `runtime/field-handle-cache.ts` | Handle per concrete path, so callbacks keep their identity |
| `runtime/form-state-cells.ts` | `errorCount`, `submitting`, `submitCount`, `validating` |
| `runtime/submit-form.ts` | Reads every issue, mounted or not; reports what blocked |
| `runtime/reset-form.ts` | One `replaceRoot`-shaped batch, plus cell reconciliation |
| `runtime/create-form.ts` | Assembles the above into `FormHandle` |
| `runtime/form.types.ts` | `FormHandle`, `FormOptions`, `RowsHandle` |
| `index.ts` | Re-exports only |

### `packages/form-react`

| File | Single responsibility |
|---|---|
| `form-context.ts` | The context whose value is the handle and never changes identity |
| `form-provider.tsx` | Provides the handle and the widget table |
| `use-create-form.ts` | Per-instance creation; the SSR-safe entry point |
| `field-scope-context.ts` | The enclosing path prefix, row indices and participation |
| `field-scope.tsx` | `<FieldScope prefix row participating>` |
| `resolve-scoped-path.ts` | A local name + a scope → a declared path and its indices |
| `use-cell.ts` | The one `useSyncExternalStore` call site |
| `use-form.ts` | Reads the handle off the context |
| `use-field.ts` | Four `useCell` calls composed into a `FieldBinding` |
| `use-field-value.ts` | The value channel alone |
| `use-field-issues.ts` | The issues channel alone |
| `use-form-status.ts` | Four aggregate cells, composed in the component body |
| `use-rows.ts` | The rows cell plus the structural callbacks |
| `field-binding.types.ts` | `FieldBinding` and `FieldInputProps` |
| `build-input-props.ts` | Descriptor constraints → DOM attributes; composition tracking |
| `field.tsx` | Layer 3 with `children`, layer 2 with `as` |
| `field-rows.tsx` | Rows keyed by opaque row id |
| `widget-registry.types.ts` | Layer 2: `byPath`, `byFormat`, `byKind` |
| `resolve-widget.ts` | `byPath` → `byFormat` → choices present → `byKind` → fallback |
| `auto-field.tsx` | One tree node drawn through layer 3 |
| `auto-form.tsx` | Layer 1: walks the descriptor tree in declaration order |
| `index.ts` | Re-exports only |
| `widgets/*.tsx` | One file per kind, behind a separate entry point |

### `packages/form-store-zustand`

`create-zustand-cell-store.ts`, `index.ts`. Its test file is `assertFormStoreContract(() => createZustandCellStore(createStore(() => ({}))), expect)` and nothing else.

### `C:/projects/luq` — the upstream changes

| File | Single responsibility |
|---|---|
| `src/chain/default-declaration-recorder.ts` | The recorder moved out of `standard-schema/`, installed from `src/builder/index.ts` at module scope |
| `src/form/describe-luq-fields.ts` | Builds the descriptor list from the declared calls and the plan |
| `src/form/slot-to-form-kind.ts` | `DeclaredCall.slot` → `FormFieldKind` |
| `src/form/declared-calls-to-constraints.ts` | `min`/`max`/`pattern`/`step`/`format` off `DeclaredCall.args` |
| `src/form/declared-calls-to-choices.ts` | `literal`/`oneOf` → `choices` |
| `src/form/is-unconditionally-required.ts` | `required` yes; `requiredIf` no, and why |
| `src/form/create-luq-form-adapter.ts` | `Validator<T, T, TDeclared>` → `FormAdapter<T, TDeclared>` |
| `src/form/luq-issues-to-form-issues.ts` | `ValidationIssue` → `FormIssue` |
| `src/form/index.ts` | The new `@maroonedog/luq/form` subpath |

**Luq ships a `/form` subpath exporting `luqResolver`, and the declaration recorder becomes the default.** Both halves are load-bearing, and each one closes a blocker a judge raised as fatal. The recorder installs only as a module-scope side effect of `to-standard-json-schema.ts`, which `"sideEffects": false` permits a production bundler to drop — so descriptors would be empty in the production build and correct in development, which is the worst failure shape available; that same import also drags the whole JSON Schema emitter into a browser form bundle. And `readDeclaredCalls` reaches no barrel, so nothing outside the package can read what was declared without a deep import that Node's subpath encapsulation refuses. Making the recorder the default costs one array copy per chain step at `build()` time — once per validator, never per `validate()`. `luqResolver` returns a `FormAdapter<T, TDeclared>`; `build()` gains no member and Luq takes **no dependency on form-contract**, because the adapter is built by the subpath rather than carried by the validator. `build(): Validator<T, T, TDeclared>` is the one signature change, and its third parameter defaults to `FieldPath<T> & string`, so every existing `Validator<T>` is unaffected.

---

## 7. What was rejected

**The read ledger / implicit read tracking** — the top-scoring design's centrepiece, killed by both its judges and rejected outright. It sealed at the end of `Field`'s synchronous render, so `<Field>{(email) => <MyInput field={email} />}</Field>` — the single most routine React refactor there is — recorded nothing, subscribed to nothing, and produced a controlled input whose owner never re-renders: silent, with no error and no compile-time signal. Worse, it made layer 3 a hook-forbidden zone, because `Field` had to call `children` inside its own body to own both ends of the ledger, which fails R1's explicit bar that layer 3 be **real** React. Replaced by explicit per-channel subscription (`useField`, `useFieldValue`, `useFieldIssues`), which is hook-legal, makes passing the binding to a child component normal and safe, and is what both prior-art libraries do.

**The tracking Proxy** — rejected on three independently fatal grounds a judge verified in source. `run-plan.ts` reads every field unconditionally and `abortEarly: false` means `shouldStopPlan()` never trips, so the "rediscovered dependency set" is invariantly *every declared path*. The write fan-out fires `ROOT_CELL` on every write anyway, so the reaction could never be skipped. And `Object.keys` in the `object-*` plugins degenerates it, `compareField` puts a read value into `IssueDetail.expected` so a child proxy escapes into a user `messageFactory`, and a frozen `defaultValues` — an ordinary module constant — makes the `get` trap throw a hard `TypeError` on a non-configurable non-writable property. It carried every hazard and paid for none of them.

**A dependency index (`dependentsOf` / `isFieldRunExact`) and per-field validation runs** — rejected as a *pessimisation*, not merely a complication. `create-field-validator.ts` runs the whole plan and filters; `create-subset-validator.ts` says outright there is no subset plan. A closure of five paths routed to five `validateField` calls costs five full-plan runs where one `validateRoot` produces strictly more information. This deletes two of four members of the validation port and six modules.

**Row tokens as cell keys (`items[#r7].quantity`)** — rejected in favour of concrete indices. It buys freedom from renumbering *in the store* and, as a judge verified, nothing *in the renderer*: `<FieldRows>`'s children function is user-written, so a rows change re-runs it and constructs fresh elements for every surviving row, which React re-renders regardless of `key`. Against that it adds a third path grammar and two conversions on every issue scatter — the top-named defect class in two designs, where an off-by-one silently puts row 3's error on row 2. **Row identity is kept only where it pays: opaque row ids are the React `key`, preserving DOM node, focus and per-row local state across a splice, while cell keys stay concrete.** Cost, stated plainly: splicing at index 0 re-subscribes and re-renders every following row.

**A bundled `getSnapshot`** — `readFormState()` returning `{isSubmitting, submitCount, errorCount}` and `RowsHandle.list()` returning fresh `RowApi` objects both build a value per call and, used as a snapshot, produce React's "getSnapshot should be cached" loop. A judge caught both in a design that claimed it had eliminated the need for equality functions. Rejected: one cell per aggregate, one hook per cell, compose in the component.

**A four-member store contract** — rejected for having no reclamation. Rows churn, index-keyed cells orphan, and a public four-member contract can never grow a fifth without breaking every adapter. `forget` ships in v1.

**A per-field `validating` cell** — rejected. With a whole-form run it writes `true` then `false` on *every* address per keystroke, so every mounted input re-renders twice per character, which is R4 inverted. There is one form-level `validating` cell, written only when an async pass is in flight.

**Module-scope `createForm`** in every example — rejected as an SSR cross-request data leak. `useCreateForm` is the documented entry point.

**A narrowed `onChange` shape** — rejected; it removes `nativeEvent.isComposing` and makes IME unhandleable in a library written by a Japanese author.

**Code generation and schema-driven-only rendering** — rejected by the author up front, and nothing here reintroduces them: `createForm` is a runtime function, there is no build step, no transform, and no compiler plugin. Nothing anywhere compiles a string — `match-declared-path.ts` scans rather than building a `RegExp` — so **Luq's CSP guarantee is preserved end to end**.

### What cannot be fixed

1. **React's floor.** One keystroke costs lane marking O(depth) plus, at every level from the root, cloning and bailing out of every sibling. A flat 200-field form is ~200 fiber visits per keystroke in the best case, against `observers.length` of one signal in Solid. "Only this input re-renders" is true at the component level and false at the fiber-visit level. What this design guarantees is that the *store* contributes nothing on top of it.
2. **Every store-driven update is SyncLane.** `forceStoreRerender` hard-codes lane 2, so a form cannot say "typing is urgent, this summary panel is a transition" at the store boundary. That has to be reintroduced with `useDeferredValue` inside the consuming component.
3. **Validation is O(schema) per settled change.** Luq offers no cheaper scoping — `pick()` and `pickAll()` both run the whole plan — and `requiredIf`/`validateIf` carry an opaque `RootPredicate`, so a sound dependency map is undecidable, not merely hard. Mitigations are honest and partial: microtask coalescing, the `validateOn` policy, and the per-path diff that keeps *notification* proportional to what changed. The only real fix is a Luq-side `validateFields(declaredPaths)` that runs a subset of plan nodes, which is a future upstream change, not something this runtime can do from outside.
4. **A render-prop children function cannot safely host hooks.** That is React, not this library; `useField` is the answer and the documentation says so on the first page.
5. **Concurrent rendering plus an external store keeps its whole-root failure mode.** A write landing during a transition-lane render fails the consistency check and the entire render is discarded and redone synchronously. Per-key subscriptions make it rare; they do not make it cheap.
6. **A broadcast-backed adapter cannot reach O(1) notification.** Zustand and Redux pass the conformance kit, but their granularity comes from the shipped listener index and costs one `Object.is` per observed key per write. R3 is genuine; the sentence around it must not claim otherwise.

---

## 8. The first vertical slice

Two flat string fields, `billing.postcode` and `shipping.postcode`, with `compareField` between them and shipping behind a toggle that unmounts it. Layer 3 only. **No arrays, no `AutoForm`, no widgets, no `FieldScope`, no async, no participation, no submit, no `parseRoot`.** It is deliberately the smallest thing that exercises all four requirements at once.

**Luq (7 files):** `src/chain/default-declaration-recorder.ts` and its install line in `src/builder/index.ts`; `src/form/slot-to-form-kind.ts`, `declared-calls-to-constraints.ts` (four plugins: `required`, `stringMin`, `stringMax`, `stringPattern`), `is-unconditionally-required.ts`, `describe-luq-fields.ts`, `create-luq-form-adapter.ts`, `luq-issues-to-form-issues.ts`, `index.ts`; plus widening `build()` to carry `TDeclared`.

**form-core (14 files):** `form-cell-store.types.ts`, `cell-key.ts`, `cell-listener-index.ts`, `create-cell-store.ts`, `store-contract-cases.ts`, `assert-form-store-contract.ts`, `concrete-path.ts`, `path-relation.ts`, `read-value-at.ts`, `write-value-at.ts`, `seed-root-value.ts`, `interned-defaults.ts`, `cell-source.ts`, `fan-out-write.ts`, `group-issues-by-path.ts`, `same-issue-list.ts`, `distribute-issues.ts`, `schedule-validation.ts`, `create-field-handle.ts`, `field-handle-cache.ts`, `create-form.ts`.

**form-react (7 files):** `form-context.ts`, `form-provider.tsx`, `use-create-form.ts`, `use-cell.ts`, `use-field.ts`, `build-input-props.ts`, `field.tsx`.

**form-store-zustand (1 file).**

Seven tests, and the slice is not done until all seven pass:

1. **R4.** Render counters on three components (billing input, shipping input, form shell). Typing one character into billing increments **exactly one** counter, by exactly one.
2. **R2, values.** With `<ShippingSection>` unmounted, editing billing produces the correct `compareField` verdict — the rule reads the seeded shipping value out of `ROOT_CELL`.
3. **R2, isolation.** `form.field("billing.postcode").validate()` returns exactly `validator.validate(root).issues.filter(i => i.path === "billing.postcode")`, and `check(candidate)` returns the same for a value the store does not hold and leaves the store byte-identical.
4. **The cross-field direction.** Editing shipping moves the error onto billing's path and increments **only** billing's render counter. Then unmount billing, edit shipping again, remount billing: the correct error is on screen on billing's **first** render, with no additional validation pass.
5. **R3.** `assertFormStoreContract` passes for `createCellStore()` and for `createZustandCellStore(...)`, and tests 1–4 re-run green with the Zustand store injected via `createForm({ store })`.
6. **The diff.** A validation pass that changes one field's issues writes exactly one issue cell; a pass that changes nothing writes zero. Assert against a spy on `store.write`.
7. **CSP.** `grep -rn "new Function\|eval("` over both new packages and `src/form/` returns nothing.

Test 4 is the one that matters most: it is the case RHF drops at `validateField.ts:57` and TanStack drops at `getLinkedFields`, it is the reason to run the whole plan and diff, and if it passes with the counters from test 1 still at one, the design is proved.