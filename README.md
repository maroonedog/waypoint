# form-contract

**A form renderer needs to know what a field accepts before anyone types in
it. A validator knows, and has no way to say so.**

Validation answers one question: is this value acceptable? That answer arrives
after a value exists, which is too late to decide whether to draw a number
input or a select, whether to put a required mark on a label, or what to write
in `minlength`.

This repository is that other half — a contract, and a form runtime built on
it.

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

The packages are npm workspaces, so `form-core` and the rest resolve to each
other with no linking step.

---

## The contract

```ts
type FormResolver<TSchema, T, TPath extends string = string> =
  (schema: TSchema) => FormAdapter<T, TPath>;

interface FormAdapter<T, TPath extends string = string> {
  readonly fields: readonly FormFieldDescriptor[];
  validate(root: unknown): MaybeAsync<readonly FormIssue[]>;
}
```

A resolver is a plain function, named at the call site. There is no registry,
no vendor tag and no dispatch, because whoever writes the call already knows
which validator they are using.

Each descriptor is one field a renderer can draw:

```ts
interface FormFieldDescriptor {
  readonly path: string;          // "owner.name", "items[*].quantity"
  readonly kind: FormFieldKind;   // string | number | boolean | date | array | object | unknown
  readonly isRequired: boolean;
  readonly constraints: FormFieldConstraints;   // minimum, maxLength, pattern, format, step...
  readonly choices?: readonly FormFieldChoice[]; // present only on a closed field
}
```

Constraint values are carried as declared. A pattern stays a `RegExp`, because
how a renderer spells one is that renderer's business.

### The type survives

`T` is the form's value type and `TPath` the paths that may be addressed, so a
misspelt path is a compile error rather than a field that silently never
renders.

```ts
const adapter = zodFormResolver(
  z.object({ owner: z.object({ email: z.string() }) })
);

type Values = FormValues<typeof adapter>;   // { owner: { email: string } }
type Paths  = FormPaths<typeof adapter>;    // "owner" | "owner.email"

const good: Paths = "owner.email";
const typo: Paths = "owner.emial";          // compile error
```

Carrying the type is what keeps the contract neutral about direction. A
type-first validator passes the type its rules were written against; a
schema-first one passes what its schema infers. Both arrive as the same form.

---

## The runtime

A flat, path-keyed cell space that lives outside React, plus one whole-root
validation pass per settled change whose verdict is scattered back into
per-path issue cells, writing only where the content actually differs.

**Mounting is a subscription and nothing else.** Every cell exists from
`createForm`, seeded from the descriptors, so a component does not register a
field, seed a default, or reset anything on unmount. A field rendered in a
portal, in a lazily loaded chunk or behind a condition is therefore not a
case — there is no `shouldUnregister`, no ref callback and no inspection of
the React tree anywhere in the runtime.

```tsx
const form = useCreateForm(() => ({
  adapter: zodFormResolver(orderSchema),
  defaultValues,
}));

<FormProvider form={form}>
  <Field<string> path="billing.postcode">
    {(field) => (
      <label>
        <span>請求先郵便番号</span>
        <input {...field.inputProps} aria-invalid={field.issues.length > 0} />
        {field.issues.map((issue) => <em key={issue.code}>{issue.message}</em>)}
      </label>
    )}
  </Field>
</FormProvider>
```

### Three heights, one primitive

| | |
|---|---|
| **Layer 1** | `<AutoForm />` draws every declared field, in declaration order |
| **Layer 2** | `<Field path="…" as="postcode" />` names a widget from a registry |
| **Layer 3** | `<Field path="…">{(field) => …}</Field>` — plain React, no second DSL |

Layer 1 is layer 2 with a default widget table; layer 2 is layer 3 with the
caller's function looked up instead of written inline. There is no second
implementation for the heights to diverge between, and the library ships no
input and no class name of its own.

### A wildcard read as the whole column

Outside a row scope, `items[*].sku` ordinarily means every sku the list holds.
That reading has its own hook:

```tsx
const skus = OrderForm.useFieldValues<string>("items[*].sku");   // readonly string[]
const one  = OrderForm.useField<string>("items[0].sku");         // string
```

Two hooks rather than one, for a reason worth stating: the same expression
cannot be a `string` at `items[0].sku` and a `string[]` at `items[*].sku`
without the spelling saying which. That would be a type that depends on where the component was rendered,
which TypeScript cannot express and a reader could not predict.

It binds what the scope supplies and leaves the rest open, so inside one row of
an outer array a nested wildcard reads **that row's** column rather than every
row's. And it is the one hook here that is not O(1): it subscribes to one cell
per place the wildcard covers, plus the row order of every array it crosses.
Two hundred rows is two hundred subscriptions — the honest price of the
question, paid only by the component that asks it.

`useField` with an unbound wildcard still refuses, because one field is one
place and binding row 0 would silently address a row nobody asked for. The
error now names `useFieldValues` as the other thing you might have meant.

### The path a hook is allowed to ask for

One React context object serves every form in the application, so the context
cannot be generic and a path union cannot travel through it. What that cost,
before it was closed: `useField` took a `string`, and a misspelt path rendered
an empty input that was never validated and threw nothing.

The types therefore do not travel. The application **registers** them once, and
every hook reads them from there:

```ts
// src/form-registry.ts — one file, one declaration
const orderAdapter = zodFormResolver(orderSchema);

declare module "form-react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}
```

```tsx
// any component, at any depth. It imports nothing from the file above.
const postcode = useField("billing.postcode");   // string | undefined, inferred
const typo     = useField("billing.postcod");    // compile error
const sku      = useField("items[0].sku");       // a place, checked as its rule
const count    = useField(`items[${i}].sku`);    // a computed index, fine
```

Nothing is passed down and nothing is asserted. `useField<string>(path)` used
to mean "trust me"; there is no longer anything to trust.

**Several forms** are several keys, named at the call site:

```ts
declare module "form-react" {
  interface FormTypeRegistry {
    order: typeof orderAdapter;
    profile: typeof profileAdapter;
  }
}
```

```tsx
useField("order", "items[0].sku");
useField("profile", "items[0].sku");   // compile error: profile has no items
useField("items[0].sku");              // no key: checked against every form
```

A key names a form in the REGISTRY, and the instance still comes from the
nearest provider — the one thing the types cannot relate. So a provider carries
its key (`<FormProvider form={form} formKey="order">`) and a keyed hook throws
when they disagree. Naming no key accepts whichever provider is there, which is
what a component shared by two forms wants.

**A schema nobody wrote down** — built from a response, generated in a
benchmark — registers `FormAdapter<unknown, string>`. `AddressablePath<string>`
is `string`, so that form is back to unchecked paths by its own declaration, in
one place a reader can find. There is no second API for anyone else to choose
between.

**Registration is global to the compilation, not to the import graph.** A
component that never imports the registry is still checked; a registration file
that falls out of `tsconfig`'s `include` fails loudly rather than degrading —
the error quotes the declaration you are missing.

At run time none of this exists. Whether a path is real is the store's
question, and the store answers it for every caller:

```
[form-contract] "billing.postcod" is not a field this form has, so it will draw
nothing and validate nothing. Did you mean: billing.postcode?
```

That comes from `form.field()`, which every hook, every `<Field>` and every
non-React caller funnels through — so a component rendered under a different
form's provider is caught by the store it is actually inside.

It **warns**, once per path; it does not throw. A mis-addressed field is inert,
but it cannot let bad data through: the pass judges the whole root, so the
verdict and the submit gate stay correct and what broke is one field's display.

A path counts as existing when it is a declared leaf **or an ancestor of one**.
A resolver emits leaves only, so `items` and `billing` have no descriptor while
both are perfectly ordinary to address — an array-level issue lands on the
first, and reading a whole object is a normal thing to want.

Plain `useField` remains, unnarrowed, as the escape hatch: a record field
addressed dynamically has no declared path to check against.

### A form split across components

A nested component is handed an **address** and subscribes to what it wants.
Nothing travels down but a short, stable string:

```tsx
function AddressFields({ at }: { at: string }) {
  const postcode = useField(`${at}.postcode`);   // no props but the address
  ...
}

<AddressFields at="billing" />
<AddressFields at="shipping" />
```

A list hands each row its own address:

```tsx
<FieldRows path="items">
  {({ rows, remove }) =>
    rows.map((row) => <RowFields key={row.key} at={row.path} />)
  }
</FieldRows>
```

An address is not a value: it does not change when the value does, so passing
it re-renders nobody, and there is no state above to lift. A component may read
**anywhere** in the form at the same time — a total, a field in another
section — because its own address constrains nothing else.

There was a `<FieldScope>` that put the address in context instead. It was
removed. Wrapping a subtree rewrote **every** path inside it with no way out,
so a component asking for `shipping.postcode` from inside
`prefix="billing"` silently resolved to `billing.shipping.postcode` and drew
nothing at all — and a component written against absolute paths broke the day
somebody wrapped it, without changing. For rows it was worse than that: the
list already had the row, and passing it to a wrapper so the wrapper could put
it back into context was a round trip for information the caller was holding.

Switching a subtree off is its own thing now, addressed like everything else:

```tsx
useParticipation(form, "shipping", !sameAsBilling);
```

### Typing without waking React

`useField` subscribes to the value cell, so a keystroke re-renders the field.
Measured at 201 fields that costs a commit React spends on the **whole sibling
list** — 212 changed fibers for a keystroke that moves no verdict, of which 201
are React cloning the children of the form it had to descend through.

`useUncontrolledField` subscribes to the same cell imperatively and writes the
DOM node instead, so a keystroke reaches React not at all:

```tsx
const field = useUncontrolledField<string>("owner.name");

<input defaultValue={field.defaultValue} ref={field.ref}
       onChange={field.onChange} onBlur={field.onBlur} />
<em>{field.issues[0]?.message}</em>
```

Mounting is still a subscription and nothing else; it is the same subscription
with a different effect. Counted at 201 fields:

| per keystroke | typing, verdict unchanged | the field becomes wrong | a rule reports elsewhere |
|---|---|---|---|
| `useField` | 1 commit, 212 fibers | 2 commits, 424 | 2 commits, 424 |
| `useUncontrolledField` | **0 commits, 0** | 1 commit, 212 | 1 commit, 212 |

The double commit is the deferred pass: the value lands in one task and the
verdict in the next, so React cannot batch them. Uncontrolled, the value write
stops being React's business and only the verdict commits.

**What it costs, and why it is a second hook rather than the default:** an
uncontrolled input cannot be transformed as it is typed. Masking, upper-casing,
inserting separators — anything that rewrites the value on its way to the DOM
needs it to come back through React, which is what `useField` is for.

### A validator that has to ask something

`validate` may return a promise. A vendor that answers synchronously returns
the list itself, and nothing downstream pays for the possibility — which is why
this is one member that may be async rather than a second member that always
is.

```ts
const adapter = {
  fields: base.fields,
  async validate(root) {
    const local = base.validate(root);
    const taken = await isHandleTaken(root.handle);
    return taken ? [...local, { path: "handle", message: "すでに使われています" }] : local;
  },
};
```

Passes are numbered, so an answer overtaken by a newer one is dropped rather
than written: a late verdict describes a root that is no longer there, and
committing it would flicker the form back to what was typed before. While a
pass is in flight `useFormStatus().isValidating` is true, and a pass that
throws leaves the previous verdict standing — an error reaching the network is
not evidence that the form became acceptable.

### One field, on its own

```ts
form.field("billing.postcode").validate();     // this path's issues
form.field("billing.postcode").issuesFor("999"); // the issues a candidate would carry
```

Both run the same computation the form runs, filtered to one path. A runtime
with a separate per-field engine gives a conditionally rendered field a
different verdict depending on which engine produced it, and the difference
only shows up once the field is unmounted.

A cross-field rule lands its error on the **other** field's path with no `deps`
array and no dependents list, because the pass judges the whole root and the
diff writes wherever the verdict moved.

### Rows

```tsx
<FieldRows path="items">
  {({ rows, insert, remove }) => (
    <>
      {rows.map((row) => (
        <div key={row.key}>
          <Field<string> path={`${row.path}.sku`}>
            {(field) => <input {...field.inputProps} />}
          </Field>
          <button onClick={() => remove(row.index)}>削除</button>
        </div>
      ))}
      <button onClick={() => insert(rows.length, blankRow)}>追加</button>
    </>
  )}
</FieldRows>
```

A row keeps an opaque id for its whole life and that id is the React key, so
the DOM node, the focus and any local state inside the row survive a splice.
The cells underneath stay keyed by the concrete index and the splice moves
them. The stated cost: splicing at index 0 re-subscribes every following row.

`row.path` is the whole mechanism: a nested component builds the paths it
wants from it and needs nothing else.

### Presentation and blocking are different axes

```tsx
useParticipation(form, "shipping", false);
```

A dormant subtree stops counting toward what blocks a submit and **keeps its
values**, so a rule that compares against it goes on reading them. `submit`
judges the whole root and reports what stopped it, including issues on paths
with no component on screen — a form that submits because the offending input
was off screen is the defect this prevents.

### The store is swappable

Five members over an opaque key:

```ts
interface FormCellStore {
  read<T>(key: CellKey<T>): T | undefined;
  write<T>(key: CellKey<T>, next: T): void;
  forget(key: CellKey<unknown>): void;
  subscribe(key: CellKey<unknown>, listener: () => void): () => void;
  batch(writes: () => void): void;
}
```

Per-key notification, the `Object.is` gate, synchronous delivery and
read-your-writes inside a batch are normative, and a conformance kit ships with
the package:

```ts
assertFormStoreContract(() => yourStore(), expect);
```

`test/custom-store.test.mjs` writes the smallest correct store from scratch and
a careless broadcast one, and pins the four rules the kit names for the second.

Nothing in any package compiles a string, so a form runs under a strict
Content-Security-Policy.

---

## The showcase

`examples/showcase` — a real application form: 23 inputs across six sections,
drawn with Tailwind and Material Design 3. Its README says what each part of
the screen demonstrates.

```bash
node node_modules/vite/bin/vite.js --config examples/showcase/vite.config.ts examples/showcase
```

---

## The examples

`examples/showcase` — a real application form: 23 inputs across six sections,
drawn with Tailwind and Material Design 3.

`examples/nested-arrays` — the same `shipments[] → address{} → lines[]` shape
written four times, in form-contract, react-hook-form, Formik and TanStack
Form, side by side on one page. Same schema, same markup, same behaviour; the
only difference is how a field two levels inside a list says which row it
belongs to. Its README has the measured comparison.

```bash
node node_modules/vite/bin/vite.js --config examples/nested-arrays/vite.config.ts examples/nested-arrays
```

## The comparison

`bench/` measures this runtime against react-hook-form, Formik and TanStack
Form, in two lanes, against one zod schema the harness owns and instruments and
one DOM it owns and hashes.

```bash
npm run bench:forms         # counts, in jsdom — writes docs/measurements-forms.md
npm run bench:forms:check   # the same counts, against the recorded baseline
npm run bench:forms:time    # microseconds, in the installed Chrome
```

**The counts lane is gated.** Commits, changed fibers, DOM mutations,
validator passes and paths judged are integers that do not depend on the
machine, so a drift is never noise and CI fails on one. Nothing is printed
until six proofs hold — that every subject reached the same schema instance,
judged the same root, rendered the same DOM, is actually wired up, and that the
oracle would have noticed had it not been.

**The time lane is printed and never gated,** and it publishes its own
resolution above its results: a null experiment per subject per size, and a
calibration ladder injecting a known cost at three scheduling positions. A band
that overlaps the null band prints `indistinguishable` rather than a win.

The ladder is the part worth reading first. On the machine in the report it
resolves **0.5 ms of synchronous work and nothing at all up to 4 ms of work
deferred to a microtask** — which is exactly where form-contract puts its
validation pass. So at 201 fields, where form-contract's keystroke measures
0.63× the hand-written reference, the harness **refuses to call that a win**:
the 308 µs difference is under its own resolved floor, and it separately
measures that 0% of form-contract's validator passes ran inside the event the
metric can see. Both sentences are generated, and they sit directly under the
row they contradict.

What the lane does resolve at 201 fields is that TanStack Form is 4.1× and
Formik 3.9× the reference per keystroke, while react-hook-form is
indistinguishable from it.

Where form-contract loses, those rows sort first and carry the winner's
agreement cell. `docs/design/form-benchmark.md` is the design; Appendix A lists
every attack on the method and what was done about it.

---

## Where it stands

The runtime is complete against its design and is exercised by 117 tests, a
compile-time test that pins the path union, and a screen that uses all of it.
It has not been published, and it has not been run in production by anyone.

Two limits are stated rather than papered over. The concrete path grammar has
no escape, so a field whose key contains a dot cannot be addressed. And
validation is proportional to the schema on every settled change: the diff
keeps *notification* proportional to what actually moved, but the pass itself
judges the whole root, which is what lets a cross-field rule report against a
field that did not move.

The design this was built from is `docs/design/form-runtime.md`. Sections 7
and 8 record what was rejected and why.

## License

MIT
