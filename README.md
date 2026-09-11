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

### `<FieldScope>` is optional

A hook with no scope around it reads the root — `{ prefix: "", indices: [] }` —
so an absolute path needs nothing wrapped around it:

```tsx
// no FieldScope anywhere
const postcode = OrderForm.useField("billing.postcode");
```

There are exactly two reasons to reach for one:

| | why |
|---|---|
| `<FieldScope prefix="billing">` | so a nested component can be **propless and reusable**. Optional. |
| `<FieldScope row={row}>` | so a wildcard path gets an index. **Required** — `items[*].sku` has nowhere else to get one, and the error says so rather than binding row 0. |

A declared path is a RULE and a value has PLACES, and both are addressable:

```tsx
OrderForm.useField("items[*].sku")      // inside a row scope
OrderForm.useField("items[0].sku")      // a fixed row, no scope needed
OrderForm.useField(`items[${i}].sku`)   // i: number — a computed row
```

The index position is typed `${number}`, so a template literal tells a row
index from a string spliced into a path, which is how a mis-built path is
usually made:

```tsx
const i: number, name: string;
OrderForm.useField(`items[${i}].sku`)      // ok
OrderForm.useField(`items[${name}].sku`)   // compile error
```

A wildcard with nowhere to get an index is still an error rather than a guess —
binding row 0 would silently address a row nobody asked for.

### A wildcard read as the whole column

Outside a row scope, `items[*].sku` ordinarily means every sku the list holds.
That reading has its own hook:

```tsx
const skus = OrderForm.useFieldValues<string>("items[*].sku");   // readonly string[]
const one  = OrderForm.useField<string>("items[0].sku");         // string
```

Two hooks rather than one, for a reason worth stating: the same expression
cannot be a `string` inside `<FieldScope row={row}>` and a `string[]` outside
it. That would be a type that depends on where the component was rendered,
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

`useField` takes a `string`, and it has to. One React context object serves
every form in the application, so the context cannot be generic, and the path
union dies at that boundary. What that cost was, before it was closed: a
misspelt path rendered an empty input that was never validated and threw
nothing.

`createFormHooks` closes it from the other side. The hooks are built once from
the adapter, so they carry `TPath` without the context having to:

```ts
export const OrderForm = createFormHooks(zodFormResolver(orderSchema));
```

```tsx
const postcode = OrderForm.useField("billing.postcode");   // ok
const typo     = OrderForm.useField("billing.postcod");    // compile error
```

**Assign it to a PascalCase name.** `eslint-plugin-react-hooks` only treats a
member expression as a hook when the object is a single PascalCase identifier
(`isHook` in v7.1.1): `Order.useField()` is checked by the rules of hooks,
`order.useField()` and `forms.order.useField()` are not. Destructuring is fine
too, since a bare `useField` is a hook name by itself — it just stops naming
which form. React itself does not care: the runtime only sees call order.

At run time these still read the enclosing `<FormProvider>`, so a nested
component stays propless. What they add is a check that the path is one the
enclosing form declares, which makes the same mistake loud in JavaScript and
catches the one thing the types cannot see — hooks rendered under a different
form's provider.

It **warns**, once per path; it does not throw. A mis-addressed field is inert,
but it cannot let bad data through: the pass judges the whole root, so the
verdict and the submit gate stay correct and what broke is one field's display.
Taking the whole form down for that would be the larger failure.

Plain `useField` remains, unnarrowed, as the escape hatch: a record field
addressed dynamically has no declared path to check against.

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
form.field("billing.postcode").check("999");   // judges a candidate, writes nothing
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
        <FieldScope key={row.key} row={row}>
          <Field<string> path="items[*].sku">
            {(field) => <input {...field.inputProps} />}
          </Field>
          <button onClick={() => remove(row.index)}>削除</button>
        </FieldScope>
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

`FieldScope` also carries a prefix, so a group can be written once against
local names and placed wherever it belongs:

```tsx
<FieldScope prefix="billing"><AddressFields /></FieldScope>
<FieldScope prefix="shipping"><AddressFields /></FieldScope>
```

### Presentation and blocking are different axes

```tsx
<FieldScope prefix="shipping" participating={false}>…</FieldScope>
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

The runtime is complete against its design and is exercised by 115 tests, a
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
