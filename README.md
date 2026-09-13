# <img src="docs-site/public/favicon.svg" width="26" height="26" alt="" align="top"> waypoint

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

One claim, two halves. The type is one `WaypointForms` module augmentation:
a leaf takes no prop, no generic argument and imports nothing from the registry,
and an application that registered nothing is **refused**, with the
declaration it is missing quoted back at it — unless a dependency registered
one, in which case it inherits that one's paths instead. Registration is global
to the compilation and nothing namespaces it yet. The state is written at `createForm` from the descriptor list, before
any component exists — so mounting is a subscription, and there is no register,
no unregister and no `shouldUnregister`.

📖 **The documentation site is the documentation.** It is in `docs-site/` and is
**not served anywhere yet** — no domain has been chosen and GitHub Pages will
not publish a private repository. `npm run docs:dev` builds it. What is there
and not here: a form you can type into with a render counter on every row and a
tape printing every cell the runtime writes, the two-spec contract, how a path
gets its type and what it costs the compiler, every hook and component with the
signature the package emits, and the benchmark with its losses first.

## Install

Nothing is published. The publish workflow is manual-dispatch only and has
never been run.

```bash
git clone https://github.com/maroonedog/waypoint
cd waypoint && npm install && npm run verify
```

## One screen of it

```ts
// src/waypoint-forms.ts — one declaration, one time, for the whole application.
const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint/react" {
  interface WaypointForms { form: typeof orderAdapter }
}
```

```tsx
function OrderForm() {
  const form = useCreateForm(() => ({ adapter: orderAdapter, defaultValues }));
  return (
    <FormProvider form={form}>
      <Postcode at="form:billing.postcode" />
      <Items />
      <button onClick={() => form.submit(save)}>Save</button>
    </FormProvider>
  );
}

// Any depth. It imports nothing from the registry and receives nothing but an
// address, which names its own form — so one prop is the whole story, and the
// label, the bounds and the aria wiring come off the schema.
function Postcode({ at }: { at: FormPathTo<string> }) {
  const field = useField(at);
  return (
    <>
      <label {...field.labelProps}>{field.descriptor?.label}</label>
      <input {...field.inputProps} />
      <em {...field.errorProps}>{field.issues[0]?.message}</em>
    </>
  );
}

function Items() {                        // a row hands down its own address,
  const items = useRows("form:items");    // qualified, so it is complete
  return items.rows.map((r) => <Postcode key={r.key} at={`${r.path}.sku`} />);
}
```

**A path carries its form.** `form` is the key registered above, the colon ends
it, and the value is read in THAT form rather than in whichever registered form
happens to have one there. With a single form registered the prefix is optional.

```tsx
useField("form:billing.postcode");  // string | undefined, inferred
useField("form:billing.postcod");   // compile error
useField(`form:items[${i}].sku`);   // a computed index is fine
useField(`form:items[${s}].sku`);   // compile error: s is a string
```

## Both directions of "that field does not exist"

A path no form declares has always been reported. The other direction is
reported too: once a `<FormProvider>`'s subtree has mounted, every declared
place that nothing drew is named.

```
[waypoint] 2 declared field(s) nothing has drawn (checked when this <FormProvider> finished mounting).
  nothing asked for: "form:billing.city" (City)
  asked for, no widget: "form:plan" (Plan)
```

That is not a missing input. The cell exists, the default was seeded and the
validator judges it, so a required one refuses every submit while the error
summary names a control nobody can see — and the reader goes looking for the
bug in the submit button. `createForm({ onFieldMismatch: "throw" })` turns both
directions into errors, which is what a test wants rather than a console;
`<FormProvider partial>` says this screen draws part of the form on purpose;
and `form.coverage.missing()` is the same question as a plain query, at any
moment, with nothing rendered.

## When a field starts complaining

`validateOn` decides when a PASS RUNS, and that is a fact about the form: one
pass judges the whole root, so there is no per-field pass to gate. What it was
also being asked to decide is when a FIELD SPEAKS, and it never could —
measured on a two-field form with `validateOn: "blur"`, blurring `a`
published `b`'s verdict too, and a field nobody had reached was marked
`aria-invalid` because a different one lost focus.

So the second question is asked where it is true, at the call:

```tsx
useField("form:email", { showIssues: "touched" })   // "immediately" | "touched" | "dirty"
<FormProvider form={form} showIssues="touched">     // the default for a subtree
```

It governs **display and nothing else**. The pass runs as it always did, and
`errorCount`, `blockedBy` and the submit gate all still count a field that is
saying nothing — so a quiet field still refuses the submit, which is what
`useErrorSummary()` is for. A refused submit reveals every field whatever it
asked for.

## Decorating your own element

The four prop bags are offered and spreading them is still the shortest path.
For an element that already has props of its own, spreading is a merge with two
silent failures — whichever `onChange` is written second wins and the other
never runs, and `aria-describedby` truncates to one side and stops being
announced:

```tsx
const field = useField(at);
return field.decorate(<input className="mine" onChange={track} />);
```

Handlers and refs compose, `aria-describedby` joins, the field wins on every
key it sets, and everything else is left alone. `field.decorate(el, "label")`
does the same for the other three elements.

The rest — `useUncontrolledField`, `useFieldValue`, `useFieldValues`,
`useFieldIssues`, `useFormStatus`, `useRows`, `useParticipation`,
`useErrorSummary`, `<Field>`, `<FieldRows>`, `<AutoForm>`, `adoptIssues` and
`validateOn` — is on the site's **API** page, with the emitted signatures.

## Seven entry points, one package

| Entry | What it is |
|---|---|
| `@maroonedog/waypoint` | The contract and the path types. One runtime export, `isPending`. |
| `@maroonedog/waypoint/resolver-standard` | Describes and judges **any** validator implementing Standard Schema and its JSON Schema companion. No vendor named in it. |
| `@maroonedog/waypoint/resolver-zod` | The above, plus the three facts zod's own JSON Schema does not carry about zod. |
| `@maroonedog/waypoint/resolver-luq` | The above, plus [luq](https://luq.dev)'s issue codes and severities, which the spec has no member for. |
| `@maroonedog/waypoint/core` | The runtime. No React, no validator, no DOM. |
| `@maroonedog/waypoint/react` | React bindings. |
| `@maroonedog/waypoint/store-zustand` | A zustand store, as a shipped instance of the store contract `./core` exports. |

They are entry points rather than packages because they all install together
anyway. What the split buys is **resolution**: `./core` loads in a worker with
no React resolvable at all, and only `./react` names React in its built output.
`useField` alone is 2.01 kB gzipped against 10.90 kB for the whole `./react` barrel,
and a screen plus the zod resolver is 10.72 kB. `npm run size:check` gates every row.

## What it does not do

No `debounceMs` and no per-field validation mode. No multi-file input and no
file byte or MIME constraint. No FormData decoder, server-action integration or
RSC data path. No React Native bindings. No devtools extension. A
`Record<string, T>` member is addressable but undescribed, and a field inside a
union branch is described as optional whatever its branch says.

Each of those is on the site with how far you would get and what to reach for
instead. **A capability list without them is an advertisement**, which is why
this paragraph is here and not in an appendix.

Accessibility is the same kind of entry. Both bindings hand back four prop bags that
carry `id`, `type`, `aria-invalid`, `aria-describedby` and the declared bounds off
the descriptor, `useErrorSummary()` orders a failed submit the way a reader meets
the fields, and `axe` runs over four synthetic forms in CI.
`docs/accessibility-criteria.md` takes all fifty-five WCAG 2.2 A and AA criteria one
at a time and says, for each, whether this library helps with it, leaves it to the
caller, or cannot touch it at all — and which rules a machine checked rather than an
author argued. **Nothing here has met a screen reader or an auditor.**

## Measured against nine subjects

`bench/` drives nine subjects — two of this runtime, a hand-written per-field
reference, three of react-hook-form, two of Formik, one of TanStack Form — through
one transcript, one zod schema it owns and instruments, one DOM it hashes.

**waypoint is behind on all four scenarios, at every size**, and the report
prints the rows it loses before its own table. Who beats it is the part worth
reading: on two of the four, the winning row wins by **not showing the
message**. The counts lane is gated in CI because commits and changed fibers do
not depend on the machine; the time lane is printed and never gated.

```bash
npm run bench:forms         # counts, in jsdom
npm run bench:types         # what the path types cost the compiler
npm run bench:self-audit    # the runtime against its own design document
```

## Examples

```bash
npm run example:showcase        # a designed screen, six sections
npm run example:server-errors   # what a server says, and what drops it
npm run example:two-forms       # two forms on one page, one set of inputs
npm run example:wizard          # one form, three screens
npm run example:nested-arrays   # the same shape in four libraries, side by side
npm run docs:dev                # the documentation site
```

- **server-errors** — the submit handler's round trip. One rejection lands on a
  field and is dropped by editing it; the other lands on a path no descriptor
  declares and no input draws, still refuses the submit, and is dropped only by
  the next press.
- **two-forms** — both forms declare `owner.email`. The same component draws
  both, imports neither schema, and takes one prop: an address that names its
  own form. `src/refusals.tsx` holds the compiler to the five spellings that
  must not compile.
- **wizard** — one form across three screens, with `partial` on the provider
  and the whole root judged at submit, so a step nobody opened still refuses it.
- **nested-arrays** — one `shipments[] → address{} → lines[]` shape written
  four times against one schema with the same markup and the same behaviour, so
  the only difference left is how a field two levels inside a list says which
  row it belongs to.

No example needs a build: they resolve the package to its **source**.

## Where it stands

291 tests and eleven compile-time programs, one of which exists only to prove that
an application registering nothing is refused rather than quietly unchecked —
so long as nothing it depends on registered a form of its own.
**Nothing has ever been published, and nobody has run this in production.**

`CLAUDE.md` carries the conventions this codebase is held to.
`docs/design/form-runtime.md` is the design it was built from, and its section
7 records what was rejected and why.

## License

MIT
