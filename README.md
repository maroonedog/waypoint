# form-contract

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

One claim, two halves, and neither is worth much alone. The type is one
`FormTypeRegistry` module augmentation: a leaf takes no prop, no generic
argument and imports nothing from the registry, and an application that
registered nothing is **refused** rather than quietly unchecked. The state is
written at `createForm` from the descriptor list, before any component exists —
so mounting is a subscription, and there is no register, no unregister and no
`shouldUnregister`.

📖 **[formcontract.dev](https://formcontract.dev)** — a form you can type into,
with a render counter on every row and a tape under it printing every cell the
runtime writes.
[Start](https://formcontract.dev/start/) · [Validation](https://formcontract.dev/validation/) · [The runtime](https://formcontract.dev/runtime/) ·
[Typed paths](https://formcontract.dev/paths/) · [API](https://formcontract.dev/api/) · [Benchmark](https://formcontract.dev/benchmark/)

| Package | What it is |
|---|---|
| `form-contract` | The contract and the path types. No dependencies. |
| `form-contract-resolver-zod` | Describes and judges a zod schema. zod is a type-only import, erased at build time. |
| `form-contract-resolver-luq` | The same for [luq](https://luq.dev), through the JSON Schema it can already produce. |
| `form-core` | The runtime. No React, no validator. |
| `form-react` | React bindings. |
| `form-store-zustand` | A zustand-backed store, as a worked example of substituting one. |

Nothing here is published yet. Clone
[the repository](https://github.com/maroonedog/form-contract), `npm install`,
then `npm run verify` — it builds every package and runs the tests and the type
tests.

---

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
      <button onClick={() => form.submit(save)}>Save</button>
    </FormProvider>
  );
}

// Any depth. It imports nothing from the registry and receives nothing but an address.
function Postcode({ at }: { at: FormPathTo<string> }) {
  const field = useField(at);
  return (
    <>
      {/* A sibling, not a wrapper: a label that wraps the input and also points
          at it contributes no text of its own, so the field's accessible name
          would be whatever else was inside — nothing, and then the error. */}
      <label {...field.labelProps}>{field.descriptor?.label}</label>
      <input {...field.inputProps} />
      <em {...field.errorProps}>{field.issues[0]?.message}</em>
    </>
  );
}

function Items() {                        // a row hands down its own address,
  const items = useRows("items");         // and the address is still checked
  return items.rows.map((r) => <Postcode key={r.key} at={`${r.path}.sku`} />);
}
```

**Mounting is a subscription and nothing else.** A component does not register a
field, seed a default or reset anything on unmount, so a field in a portal, in a
lazily loaded chunk or behind a condition is not a case — no ref callback, no
inspection of the React tree. And an **address** is not a value: it does not
change when the value does, so passing it down re-renders nobody, there is
nothing above to lift, and a component may read elsewhere in the form as well.

→ [What a write touches](https://formcontract.dev/runtime/) · [Why a rule reports against a field you did not touch](https://formcontract.dev/validation/)

## Paths are typed by a registry, not by a prop

One React context object serves every form in an application, so the context
cannot be generic and a path union cannot travel through it — which is why
`useField` once took a bare `string`, and a misspelt path rendered an empty input
that was never validated and threw nothing. So the types do not travel: the
application registers them once, above, and every hook reads them from there.

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
several keys, and a schema with no static shape registers
`FormAdapter<unknown, string>` — back to unchecked paths, by its own
declaration, in one place a reader can find.

At run time none of this exists: whether a path is real is the store's question,
and `form.field()` — which every hook, every `<Field>` and every non-React
caller funnels through — **warns once and does not throw**. A mis-addressed
field is inert but cannot let bad data through, because the pass judges the root.

**What it costs the compiler**, from `npm run bench:types`: the union is built
once, in whatever file declares the adapter, at 120–306 instantiations per leaf,
while an accepted `useField` costs 5.0 at width 300 and 5.0 at depth 7 — a
thousand components addressing one form is not where this goes wrong. **Seven
path segments are addressable and eight are not** — that is `PathDepthBudget`,
one type alias in one file — and
the first refused call costs 346,055, because the compiler elaborates the union
into the error. The escape hatch is `OpaqueObject`: a member whose interface
extends one of its arms ends the path there and keeps its own type and members —
210,887 instantiations down to 72,707 on a 729-leaf shape. Printed, never gated:
`typescript` sits at a caret range, and a patch bump rewrites every figure.

→ [Typed paths](https://formcontract.dev/paths/) · [the measurement in full](docs/measurements-types.md)

## Accessibility, and what is not done

Both bindings hand back four bags. `inputProps` carries `id` (scoped by `useId`,
so two forms on one page cannot collide), `name`, `required`, the declared
bounds, and the `type` the descriptor implies — `number`, `checkbox`, a date
family, `email`/`url`/`text`, and nothing at all for a closed or undecided
field. `aria-invalid` appears **only** when the field carries issues, and
`aria-describedby` names the help line, then the message. `labelProps` is
`htmlFor`, `errorProps` is an id and `role="alert"`, and `descriptionProps` is
`undefined` when the schema declared none, so no attribute points at an element
nobody draws. `aria-required` is deliberately absent: `required` is already on
the element, and the second copy is the one that goes stale.

**Not a differentiator, and not claimed as one:** `@rjsf/core`,
`@autoform/shadcn` and `@jsonforms/vanilla-renderers` all emit aria attributes
derived from a parsed schema, and Conform ships `id`, `errorId`,
`descriptionId`, `ariaInvalid`, `ariaDescribedBy` and `focusFirst`. **Not done,
not scheduled:** an error summary with focus management on a failed submit, a
WCAG map criterion by criterion, a gated `axe` suite, an audit by somebody who
does this for a living — and nothing here has met a real screen reader.

## What else is in here

- **The contract is two members.** `FormAdapter` is `fields` — one descriptor
  per leaf — and `validate(root)`, which judges the whole root. There is no
  `FormResolver` type: a resolver is a plain function named at the call site and
  its arity is the vendor's business (`luqFormResolver` is binary, because luq
  judges with one object and describes with another). `T` and `TPath` survive it.
- **A descriptor is a flat field list. A JSON Schema is not one.** It is a tree
  with `$ref` and combinators in it, and `form-contract-resolver-luq` is the
  walk that turns one into one descriptor per leaf. Nor is the trip free: on
  zod 4.6.1, `z.toJSONSchema(z.object({ when: z.date() }))` throws
  `Date cannot be represented in JSON Schema` — the most common non-text widget
  in a real form. And `kind` is a **widget** decision that deliberately need not
  round-trip to a TypeScript type: a validator accepting a string carrying a date
  may describe it `date`, because that is the input a person should get.
- **Three heights, one primitive.** `<AutoForm />` draws every declared field,
  `<Field path as>` names a widget from a registry, `<Field>{(field) => …}` is
  plain React. Each is the one below it with the function looked up rather than
  written inline, so there is no second implementation, and no markup of ours.
- **A wildcard read as a column.** `useFieldValues("items[*].sku")` is every sku
  the list holds; `useField("items[0].sku")` is one. Two hooks, because the same
  spelling cannot be `string` here and `string[]` there without saying which.
- **Presentation and blocking are different axes.**
  `useParticipation(form, "shipping", false)` stops a subtree counting toward
  submit and **keeps its values**, so a rule comparing against it still reads it.
- **Async validation.** `validate` may return a promise; passes are numbered, so
  a late verdict describing a root that is gone is dropped and a pass that throws
  leaves the previous verdict standing.
- **A swappable store.** Five members over an opaque key — per-key notification,
  the `Object.is` gate, synchronous delivery and read-your-writes in a batch are
  normative, and `assertFormStoreContract` ships to check them.
- **These six packages compile no string** — no `new Function`, no `eval`, and
  `concrete-path.ts` scans a path rather than building a `RegExp`. (The one
  `new RegExp` compiles a pattern the schema declared.) Table stakes, not a
  feature: react-hook-form, Formik and `@tanstack/form-core` have zero of either
  too. **The validator is the half to check.** zod 4 JIT-compiles object parsing
  by default — the `const F = Function` alias that defeats a grep is in
  `v4/core/doc.js` and the `new F("")` probe in `v4/core/util.js` — so on zod
  4.6.1 one `z.object({…}).parse()` constructs `Function` twice, measured here,
  and zero after `z.config({ jitless: true })`. A strict CSP makes the probe
  throw and zod falls back, but zod's own comment says the caught throw is still
  reported as a `securitypolicyviolation`. Setting `jitless` is yours to do.

## Measured against nine subjects

`bench/` drives nine subjects — two of this runtime, a hand-written per-field
reference, three of react-hook-form, two of Formik, one of TanStack Form —
through one transcript, one zod schema it owns and instruments, one DOM it hashes.

```bash
npm run bench:forms         # counts, in jsdom — writes docs/measurements-forms.md
npm run bench:forms:check   # the same counts, against the recorded baseline
npm run bench:forms:time    # microseconds, in the installed Chrome
```

| per keystroke, 201 fields | typing, verdict unchanged | the field becomes wrong | a rule reports elsewhere |
|---|---|---|---|
| `useField` | 1 commit, 212 fibers | 2 commits, 424 | 2 commits, 424 |
| `useUncontrolledField` | **0 commits, 0** | 1 commit, 212 | 1 commit, 212 |

`useUncontrolledField` is the same cell subscribed imperatively, writing the DOM
node rather than re-rendering. The price is the transform: an uncontrolled input
cannot be masked as it is typed, which is what `useField` is for.

**form-contract is behind on all three scenarios, at every size.** The report
says so in those words and prints the rows it loses before its own table. Who
beats it is the part worth reading: on two of the three the winning row wins by
**not showing the message** — one reports only at submit, one reports nothing at
all — and the third is form-contract's own uncontrolled binding.

**The counts lane is gated**, because commits, changed fibers, DOM mutations and
validator passes do not depend on the machine, so drift is never noise. **The
time lane is printed and never gated:** a keystroke at 201 fields measures 0.57×
the hand-written reference and the harness **refuses to call that a win**, the
difference being under the floor its own ladder resolved.

→ [What the benchmark can and cannot see](https://formcontract.dev/benchmark/)

## Examples

```bash
npm run example:showcase        # http://localhost:5179
npm run example:nested-arrays   # http://localhost:5181
npm run docs:dev                # the documentation site, with the live form
```

`showcase` is a real application form — 23 inputs across six sections, drawn
with Tailwind and Material Design 3. `nested-arrays` writes the same
`shipments[] → address{} → lines[]` shape four times — form-contract,
react-hook-form, Formik, TanStack Form, one page, one schema, same markup, same
behaviour — so the only difference left is how a field two levels inside a list
says which row it belongs to. Both have their own README, and neither needs a
build: every example resolves the packages to their **source**.

## Where it stands

The runtime is complete against its design and is exercised by 171 tests, seven
compile-time programs — one of them whose only job is to prove that an
application registering nothing is refused rather than quietly unchecked — and a
screen that uses all of it. **No package has ever been published — there is no
publish script and no publish workflow — and nobody has run it in production.**

Two limits, stated rather than papered over. The concrete path grammar has no
escape, so a field whose key contains a dot cannot be addressed. And validation
is proportional to the schema on every settled change: the diff keeps
*notification* proportional to what moved, but the pass judges the whole root,
which is what a cross-field rule reporting elsewhere costs.

Every hook and component, with the signature the packages emit, is at
[formcontract.dev/api](https://formcontract.dev/api/). `CLAUDE.md` carries the
naming rule this codebase is held to, and `docs/design/form-runtime.md` is the
design it was built from; sections 7 and 8 record what was rejected and why.

## License

MIT
