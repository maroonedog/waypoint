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

`examples/showcase` — a real申込 form, 23 inputs across six sections, drawn with
Tailwind and Material Design 3. See its README for what each part demonstrates.

```bash
node node_modules/vite/bin/vite.js --config examples/showcase/vite.config.ts examples/showcase
```

---

## Verifying

```bash
npm run verify     # build every package, run the tests, run the type tests
```

The design this was built from is `docs/design/form-runtime.md`.

## License

MIT
