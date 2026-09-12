# form-contract

**A form renderer needs to know what a field accepts before anyone types in it.
A validator knows, and has no way to say so.**

Validation answers one question — is this value acceptable? — and that answer
arrives after a value exists. Too late to decide whether to draw a number input
or a select, or what to put in `minlength`. This repository is the other half:
a contract, and a form runtime built on it.

📖 **[formcontract.dev](https://formcontract.dev)** — the contract, how a value
changes and when validation fires, how paths get their types, and what the
benchmark can and cannot see.

| Package | What it is |
|---|---|
| `form-contract` | The contract and the path types. No dependencies. |
| `form-contract-resolver-zod` | Describes and judges a zod schema. zod is a type-only import, erased at build time. |
| `form-core` | The runtime. No React, no validator. |
| `form-react` | React bindings. |
| `form-store-zustand` | A zustand-backed store, as a worked example of substituting one. |

Nothing here is published yet. Build it from source:

```bash
git clone https://github.com/maroonedog/form-contract
cd form-contract
npm install
npm run verify     # build every package, run the tests, run the type tests
```

---

## The contract

```ts
type FormResolver<TSchema, T, TPath extends string = string> =
  (schema: TSchema) => FormAdapter<T, TPath>;

interface FormAdapter<T, TPath extends string = string> {
  readonly fields: readonly FormFieldDescriptor[];   // one per leaf, drawable before any value
  validate(root: unknown): MaybeAsync<readonly FormIssue[]>;
}
```

Two members. A resolver is a plain function named at the call site — no
registry, no vendor tag, no dispatch, because whoever writes the call already
knows which validator they are using. `T` and `TPath` survive it, which is what
keeps the contract neutral about direction: a type-first validator passes the
type its rules were written against, a schema-first one passes what its schema
infers, and both arrive as the same form.

→ [The contract in full](https://formcontract.dev/contract/)

## A form

```ts
// src/form-registry.ts — one file, one declaration, one time.
const orderAdapter = zodFormResolver(orderSchema);

declare module "form-react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}
```

```tsx
function OrderForm() {
  const form = useCreateForm(() => ({ adapter: orderAdapter, defaultValues }));
  return (
    <FormProvider form={form}>
      <Postcode at="billing.postcode" />
      <Items />
      <button onClick={() => form.submit(save)}>送信</button>
    </FormProvider>
  );
}

// Any depth. It imports nothing from the registry and receives nothing but an address.
function Postcode({ at }: { at: FormPathTo<string> }) {
  const field = useField(at);
  return (
    <label>
      <input {...field.inputProps} aria-invalid={field.issues.length > 0} />
      <em>{field.issues[0]?.message}</em>
    </label>
  );
}

function Items() {
  const items = useRows("items");
  return items.rows.map((row) => (
    <Postcode key={row.key} at={`${row.path}.sku`} />   // still checked, inside a list
  ));
}
```

**Mounting is a subscription and nothing else.** Every cell exists from
`createForm`, seeded from the descriptors, so a component does not register a
field, seed a default, or reset anything on unmount. A field in a portal, in a
lazily loaded chunk or behind a condition is therefore not a case — no
`shouldUnregister`, no ref callback, no inspection of the React tree anywhere.

A row hands down an **address**, not a value. It does not change when the value
does, so passing it re-renders nobody and there is nothing above to lift, and a
component may read anywhere else in the form at the same time.

→ [How a value changes, and when a verdict happens](https://formcontract.dev/runtime/)

## Paths are typed by a registry, not by a prop

One React context object serves every form in an application, so the context
cannot be generic and a path union cannot travel through it. `useField` took a
bare `string` for exactly that reason, and a misspelt path rendered an empty
input that was never validated and threw nothing.

So the types do not travel. The application registers them once — the block
above — and every hook reads them from there:

```tsx
useField("billing.postcode");    // string | undefined, inferred
useField("billing.postcod");     // compile error
useField("items[0].sku");        // a place, checked as the rule it belongs to
useField(`items[${i}].sku`);     // a computed index is fine
useField(`items[${s}].sku`);     // compile error: s is a string
```

A module augmentation belongs to the **compilation**, not to the import graph,
so a component that never imports the registry is still checked — and a
registration file that falls out of `tsconfig`'s `include` fails loudly rather
than degrading, quoting the declaration you are missing. Several forms are
several keys, named at the call site. A schema with no static shape registers
`FormAdapter<unknown, string>` and is back to unchecked paths by its own
declaration, in one place a reader can find.

At run time none of this exists: whether a path is real is the store's
question, and `form.field()` — which every hook, every `<Field>` and every
non-React caller funnels through — **warns once and does not throw**. A
mis-addressed field is inert but cannot let bad data through, because the pass
judges the whole root.

→ [Typed paths](https://formcontract.dev/paths/)

## Typing without waking React

`useField` subscribes to the value cell, so a keystroke re-renders the field.
At 201 fields that is a commit React spends on the **whole sibling list**.
`useUncontrolledField` subscribes to the same cell imperatively and writes the
DOM node instead:

| per keystroke, 201 fields | typing, verdict unchanged | the field becomes wrong | a rule reports elsewhere |
|---|---|---|---|
| `useField` | 1 commit, 212 fibers | 2 commits, 424 | 2 commits, 424 |
| `useUncontrolledField` | **0 commits, 0** | 1 commit, 212 | 1 commit, 212 |

It is the same subscription with a different effect. **What it costs, and why
it is a second hook rather than the default:** an uncontrolled input cannot be
transformed as it is typed — masking, upper-casing, inserting separators all
need the value to come back through React, which is what `useField` is for.

## What else is in here

- **Three heights, one primitive.** `<AutoForm />` draws every declared field;
  `<Field path as>` names a widget from a registry; `<Field>{(field) => …}` is
  plain React. Layer 1 is layer 2 with a default widget table, layer 2 is layer
  3 with the function looked up instead of written inline — no second
  implementation for them to diverge between, and no input or class name of
  ours ships at all.
- **A wildcard read as a column.** `useFieldValues("items[*].sku")` is every sku
  the list holds; `useField("items[0].sku")` is one. Two hooks because the same
  spelling cannot be `string` in one place and `string[]` in another without
  saying which.
- **Presentation and blocking are different axes.**
  `useParticipation(form, "shipping", false)` stops a subtree counting toward
  submit and **keeps its values**, so a rule comparing against it goes on
  reading them.
- **Async validation.** `validate` may return a promise; passes are numbered so
  a late verdict describing a root that is no longer there is dropped, and a
  pass that throws leaves the previous verdict standing.
- **A swappable store.** Five members over an opaque key, with per-key
  notification, the `Object.is` gate, synchronous delivery and read-your-writes
  in a batch as normative rules — and `assertFormStoreContract` shipped to
  check them. `test/custom-store.test.mjs` writes a correct store and a
  careless one from scratch.
- **No string is compiled anywhere**, so a form runs under a strict
  Content-Security-Policy.

## Measured against three libraries

`bench/` drives this runtime, react-hook-form, Formik and TanStack Form through
one scripted transcript, against one zod schema the harness owns and
instruments and one DOM it owns and hashes.

```bash
npm run bench:forms         # counts, in jsdom — writes docs/measurements-forms.md
npm run bench:forms:check   # the same counts, against the recorded baseline
npm run bench:forms:time    # microseconds, in the installed Chrome
```

**The counts lane is gated** — commits, changed fibers, DOM mutations and
validator passes are integers that do not depend on the machine, so drift is
never noise and CI fails on it. **The time lane is printed and never gated,**
and publishes its own resolution above its results: at 201 fields a keystroke
measures 0.57× the hand-written reference and the harness **refuses to call
that a win**, because the difference is under the floor its own calibration
ladder resolved. The report prints the rows form-contract loses before the
rest.

→ [What the benchmark can and cannot see](https://formcontract.dev/benchmark/)

## Examples

```bash
node node_modules/vite/bin/vite.js --config examples/showcase/vite.config.ts examples/showcase
node node_modules/vite/bin/vite.js --config examples/nested-arrays/vite.config.ts examples/nested-arrays
```

`showcase` is a real application form — 23 inputs across six sections, drawn
with Tailwind and Material Design 3. `nested-arrays` writes the same
`shipments[] → address{} → lines[]` shape four times, in form-contract,
react-hook-form, Formik and TanStack Form, side by side on one page: same
schema, same markup, same behaviour, and the only difference is how a field two
levels inside a list says which row it belongs to. Both have their own README.

## Where it stands

The runtime is complete against its design and is exercised by 128 tests, six
compile-time programs that pin the path types — including one whose only job is
to prove that an application registering nothing is refused rather than quietly
unchecked — and a screen that uses all of it. **It has not been published, and
nobody has run it in production.**

Two limits, stated rather than papered over. The concrete path grammar has no
escape, so a field whose key contains a dot cannot be addressed. And validation
is proportional to the schema on every settled change: the diff keeps
*notification* proportional to what moved, but the pass itself judges the whole
root — which is what lets a cross-field rule report against a field that did
not move.

`CLAUDE.md` carries the naming rule this codebase is held to.
`docs/design/form-runtime.md` is the design it was built from; sections 7 and 8
record what was rejected and why.

## License

MIT
