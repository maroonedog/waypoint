# waypoint

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

One claim, two halves, and neither is worth much alone. The type is one
`FormTypeRegistry` module augmentation: a leaf takes no prop, no generic
argument and imports nothing from the registry, and an application that
registered nothing is **refused** rather than quietly unchecked. The state is
written at `createForm` from the descriptor list, before any component exists —
so mounting is a subscription, and there is no register, no unregister and no
`shouldUnregister`.

**Why "waypoint", and why not "contract".** A waypoint is a named place that
exists before the journey, which is the claim above. `surveyor` was considered
and rejected because it names an ACTOR, and the claim is about the state of the
world rather than about somebody establishing it; `wayfind` was rejected
because it names the act of SEARCHING, and the whole point is that there is
nothing to search for.

This was called `form-contract`, and the contract is still here — `FormAdapter`
is two members, `./` exports the types, and `assertFormStoreContract` ships.
What changed is that it stopped being the NAME. Two members over a validator is
prior art (AutoForm's `SchemaProvider`, uniforms' `Bridge`) and two standards
have since commoditised it — `~standard.validate` and `~standard.jsonSchema`,
both of which this package now reads directly rather than replacing. A product
named after the half somebody else standardised, with the differentiator left
unnamed, is a positioning mistake rather than a modesty.

📖 The documentation site lives in `docs-site/` and **is not served anywhere
yet**: no domain has been chosen, and GitHub Pages will not publish this
repository while it is private. `npm run docs:dev` builds it: a form you
can type into, with a render counter on every row and a tape under it printing
every cell the runtime writes, plus the contract, the paths, the API and the
benchmark.

One package, `@maroonedog/waypoint`, with an entry point per concern.
They are entry points rather than packages because the six this started as all
installed together anyway — six names bought a reader nothing and cost six
versions, six budgets and six security surfaces. What the split does buy is
**resolution**: `./core` loads in a worker with no React resolvable at all, and
only `./react` names React in its built output. There are seven now, and the
seventh is the one that made the other two smaller.

| Entry | What it is |
|---|---|
| `@maroonedog/waypoint` | The contract and the path types. One runtime export, `isPending`. |
| `@maroonedog/waypoint/resolver-standard` | Describes and judges **any** validator that implements Standard Schema and its JSON Schema companion. No vendor named anywhere in it. |
| `@maroonedog/waypoint/resolver-zod` | The above, plus the three facts zod's own JSON Schema does not carry about zod. zod is a type-only import, erased at build time. |
| `@maroonedog/waypoint/resolver-luq` | The above, plus [luq](https://luq.dev)'s issue codes and severities, which the spec has no member for. |
| `@maroonedog/waypoint/core` | The runtime. No React, no validator, no DOM. |
| `@maroonedog/waypoint/react` | React bindings. |
| `@maroonedog/waypoint/store-zustand` | A zustand-backed store, as a shipped instance of the store contract `./core` exports. |

Nothing here is published yet. Clone
[the repository](https://github.com/maroonedog/waypoint) — it still
answers to `form-contract`, because renaming the package and renaming the
GitHub repository are separate decisions and only the first has been taken —
then `npm install` and `npm run verify`, which builds the package and runs the
tests and the type tests.

**What it does not do is [in one place below](#limits-stated-rather-than-papered-over),
and it is not an appendix:** no `debounceMs`, no per-field validation mode, no
multi-file input and no file byte or MIME constraint, no FormData decoder or
server-action integration, no React Native bindings, no devtools extension.
Each of those says how far you would get and what to reach for instead — a
capability list without them is an advertisement.

---

## A form

```ts
// src/form-registry.ts — one file, one declaration, one time.
const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint/react" {
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

## Any validator that speaks the two specs

The contract has always claimed to be validator-neutral. It used to support
that claim by shipping two resolvers, which proves only that two can be
written. Now one resolver takes **both** of its members from specs this package
does not own:

```ts
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";

// fields  ← schema["~standard"].jsonSchema.input({ target })
// validate ← schema["~standard"].validate(root)
const adapter = standardFormResolver(schema);
```

No vendor is named anywhere in that entry point. `draft-2020-12` is asked for
first and `draft-07` on a throw, because the spec tells a library to throw on a
target it does not support and both drafts are in wide use. Some validators
hand you the describing object from a separate call — luq's
`toStandardJsonSchema(validator)`, for instance, returns one object carrying
both halves — and that object is the argument.

### So why do two vendor resolvers still exist?

Because a spec member that does not exist cannot carry anything, and both gaps
are measured rather than assumed. Run here against **zod 4.6.1**, over every
schema in `test/zod-resolver.test.mjs`, the generic walk reproduced the old
hand-written zod walk byte for byte on every field except three:

| | vendor | generic, unaided |
|---|---|---|
| `z.date()` | `kind: "date"` | `kind: "unknown"` — not representable in JSON Schema at all |
| `z.enum({ Admin: "admin" })` | `label: "Admin"` | `label: "admin"` — JSON Schema `enum` carries values, not keys |
| `z.number().int()` | no `minimum` | `minimum: -9007199254740991` — zod's spelling of a safe integer |

Each is UI that would change under a version bump: a date picker becoming a
text box, an option losing its capital, `min="-9007199254740991"` appearing on a
number input. So `zodFormResolver` keeps its signature, its output and its
migration cost of nothing — and is now the generic resolver plus those three
corrections. Everything else it used to do is gone, including the 103-line
walk that reached `globalThis.__zod_globalRegistry` for `.describe()` text:
that text survives into JSON Schema `description` on its own. Counted without
comments or blank lines, `src/resolver-zod` went from 331 lines to 195, and no
longer holds a constraints reader, a kind map, a metadata walk or a field walk.

The other gap is `code`. `StandardSchemaV1.Issue` has exactly two members,
`message` and `path`; vendors return something like a code anyway, but not
under one name. luq's own bridge says in its source that `code` and `severity`
"have nowhere to go in the spec, so they are dropped" — and the repository has
asserted on `code: "stringMin"` since before the generic path existed. So both
vendor resolvers keep the **verdict** and take the **descriptors** from the
generic one.

### What it costs

`./resolver-standard` is 2.08 kB gzipped; `standardFormResolver` alone is
1.96 kB. Both vendor resolvers grew, because each now carries the generic path:
`resolver-zod` 1.25 → 2.54 kB, `resolver-luq` 0.88 → 2.09 kB, and a screen plus
`resolver-zod` 7.63 → 9.41 kB. Recorded by `npm run size`, which is also what
checks them.

The runtime grew too. Against the figures recorded at the last commit,
`./core` is 6.16 → 7.06 kB gzipped and `./react` 8.08 → 9.38 kB, both inside
their re-recorded budgets. What is in `./core` that was not: `adoptIssues` with
the path bookkeeping that re-addresses it after a row move, the three
`validateOn` branches, and the `AbortController` reached off `globalThis` only
for an adapter that asked for a signal. What is in `./react`: the file branch in
both input-prop builders, and the `"use client"` directive.

0.43 kB of that arrived with the union walk: a `oneOf`/`anyOf` node used to
reach the descriptor walk as something none of its branches matched and come
back as one `kind: "unknown"` leaf, while `FieldPath` had already flattened the
branches into `who.a | who.b | step.kind`. The two halves of the package
disagreed about the same schema, and closing that is runtime code — in
`resolver-standard`, so both vendor resolvers get it at once.

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
useField("items[*].sku");        // compile error: one field is one place
```

**A rule and a place are different questions, and the type asks the one the
hook can answer.** `items[*].sku` names every sku in the list; `useField` has no
single value to hand back for it, and the runtime has always refused it at the
first line of `form.field()`. It used to type-check anyway, so the spelling that
compiled was the one that threw. Every surface addressing one value now takes a
place — `useField`, `useFieldValue`, `useFieldIssues`, `useUncontrolledField`,
`useRows`, `useParticipation`, `<Field>`, `<FieldRows>` — and the column reading
has its own hook, whose path type is the **wider** one:

```tsx
useFieldValues("items[*].sku");               // readonly string[] — the column
useFieldValues("shipments[0].lines[*].sku");  // one row's column
```

The second was refused before and expanded correctly at run time, which is the
same defect pointing the other way. `useParticipation` is the one that failed
**silently**: a dormant subtree is matched with a segment-anchored prefix test,
so a wildcard root matched nothing, and the subtree a caller asked to stop
blocking the submit went on blocking it.

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
once, in whatever file declares the adapter, at 137–330 instantiations per leaf,
while an accepted call costs 51.0 at width 300 and 117.0 at depth 7 — a
thousand components addressing one form is not where this goes wrong. **Seven
path segments are addressable and eight are not** — that is `PathDepthBudget`,
one type alias in one file — and
the first refused call costs 346,069, because the compiler elaborates the union
into the error. The escape hatch is `OpaqueObject`: a member whose interface
extends one of its arms ends the path there and keeps its own type and members —
228,603 instantiations down to 78,807 on a 729-leaf shape. Printed, never gated:
`typescript` sits at a caret range, and a patch bump rewrites every figure.

→ [The measurement in full](docs/measurements-types.md)

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
`descriptionId`, `ariaInvalid` and `ariaDescribedBy`, and focuses the first
invalid control itself on a refused submit. The four bags above are table
stakes.

**An error summary, ordered the way a reader meets the fields.**
`useErrorSummary()` hands back one entry per blocked path — its label, its
message, its issues, and `focus()` — plus `focusFirst()`, a `scopeProps` for
the `<form>` and a `summaryProps` for the region. The order is the whole
feature: **declaration order with row indices interleaved at the point they
occur**, never the order the validator emitted. Two leaves `items[*].sku` and
`items[*].quantity` are declaration slots 0 and 1, so ranking on the slot and
appending the index gives `items[0].sku, items[1].sku, items[0].quantity` — and
a reader meets `items[0].sku, items[0].quantity, items[1].sku`. It lists what
`errorCount` counts, which is now published as `form.blockedBy`, so an issue
`adoptIssues` put on a path nothing draws is in the summary too — that is the
issue a reader could otherwise never find.

```tsx
const summary = useErrorSummary();
// on a refused submit: summary.focusFirst(), or render the list and focus it.
<form noValidate {...summary.scopeProps} onSubmit={onSubmit}>
  {summary.entries.length > 0 && (
    <div {...summary.summaryProps}>
      <h2>There is a problem</h2>
      <ul>{summary.entries.map((entry) => (
        <li key={entry.path}>
          {/* focus() answers false when nothing on screen draws that path —
              an adopted "the card was declined" is exactly that case. The
              row still reads; there is simply nowhere to send anybody. */}
          <button type="button" onClick={() => { entry.focus(); }}>
            {entry.label ?? entry.path}: {entry.message}
          </button>
        </li>
      ))}</ul>
    </div>
  )}
  <AutoForm />
</form>
```

It costs **962 gzipped bytes on top of `useField` alone** (1,419 → 2,381),
measured with the size bench's own esbuild settings, and the ordering by itself
costs **361** on top of `createForm` (5,887 → 6,248) — `summarizeIssues` is in
`./core` and has no DOM in it, so a non-React renderer gets the order too.

**Two refusals in that shape, both deliberate.** The entries are buttons and not
GOV.UK's `<a href="#input-id">`, because the id is minted by `useId()` inside
the `useField` call so that rendering one path twice cannot put two elements
with one id in the document — a summary is at neither call site, and a guessed
id is a link that silently goes nowhere. And `summaryProps` carries `tabIndex:
-1` but no `role="alert"`: GOV.UK does both, and a library doing both announces
twice for a caller who then focuses it. `noValidate` is in that snippet on
purpose — `inputProps.required` is a real attribute, so a form without it never
fires `submit` for an empty required field and the summary never appears.

**A gated `axe` suite.** `test/accessibility-axe.test.mjs` runs axe-core 4.13.0
over rendered forms covering every `FormFieldKind`, a field with choices, a
field with a description, a field carrying an error, a list of rows and the
summary itself, and fails on any violation. It is inside `npm test`, so it is
inside `npm run verify` and inside CI. `config/axe-coverage.json` records the
sixteen rules that reached a verdict **and the two that are switched off because
jsdom cannot run them** — `color-contrast`, which reaches no verdict without
paint, and `target-size`, which left enabled reports a **pass** for a button
styled 2px by 2px, because jsdom's `getBoundingClientRect()` returns all zeros.
A rule leaving the recorded list fails the build in the same way a violation
does.

**A criterion map.** [All fifty-five WCAG 2.2 A and AA criteria, one verdict
each](docs/accessibility-criteria.md) — **Helps**, **Does not**, or **Cannot
touch**. No row says "discharges", because this library renders nothing and the
artefact a criterion is evaluated against is the rendered document. The
published gaps are the point: **1.3.5 Identify Input Purpose** is not addressed
at all — no `autocomplete` is emitted and `FormFieldConstraints` has no member
that means "this collects a person's given name" — and **2.4.11 Focus Not
Obscured** is `focusFirst()`'s own problem, because it calls `element.focus()`
and cannot know about your sticky header. The same document states, from the
primary sources, that EN 301 549 **V3.2.1** (WCAG 2.1 AA) is the version cited
in the Official Journal, that **V4.1.1 was published 2026-09-02 and does not
move the harmonised baseline** until it is cited, and that no harmonised
standard has been cited under the European Accessibility Act at all — so its
Article 15(1) presumption of conformity is not available for that Directive.

**Still not done, still not scheduled:** an audit by somebody who does this for
a living, and a screen reader — any screen reader — in front of any of it. Four
of the fifty-five rows are backed by a running assertion; the rest are argued.

## What else is in here

- **The contract is two members.** `FormAdapter` is `fields` — one descriptor
  per leaf — and `validate(root, signal?)`, which judges the whole root. There is no
  `FormResolver` type: a resolver is a plain function named at the call site,
  and although all three are unary today, a type saying so would describe what
  is written rather than constrain what may be. `T` and `TPath` survive it.
- **Validator-neutral by construction, not by writing two resolvers.**
  `standardFormResolver(schema)` takes both its members from specs this package
  does not own — `fields` from `~standard.jsonSchema.input()`, `validate` from
  `~standard.validate` — so a validator implementing them works without a file
  being added here. A vendor resolver now exists only for what the two specs
  cannot carry, and there is a measured list of what that is.
- **A descriptor is a flat field list. A JSON Schema is not one.** It is a tree
  with `$ref` and combinators in it, and the walk that turns one into one
  descriptor per leaf lives in `./resolver-standard`, where every vendor gets
  it. Nor is the trip free: on zod 4.6.1, asking a schema containing `z.date()`
  for its JSON Schema throws `Date cannot be represented in JSON Schema` and
  emits **no property at all** — the whole document is lost to one field. And
  `kind` is a **widget** decision that deliberately need not round-trip to a
  TypeScript type: a validator accepting a string carrying a date may describe
  it `date`, because that is the input a person should get.
- **A form that draws nothing says so.** A resolver that produced no
  descriptors used to return a working `validate` and an empty list, so the
  form judged correctly and rendered nothing while every symptom pointed at the
  renderer. Now "declares no JSON Schema" is a **compile error naming the
  missing member**, and the two states types cannot see — a converter that
  threw, a document with nothing in it — each get their own sentence on the
  console.
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
- **Async validation, and a signal rather than a delay.** `validate` may return
  a promise; passes are numbered, so a late verdict describing a root that is
  gone is dropped and a pass that throws leaves the previous verdict standing.
  Its optional second argument is an `AbortSignal`, aborted the moment a newer
  pass starts, so a superseded round trip can stop instead of finishing and
  being discarded. An adapter that declares only `root` is never handed one and
  causes no `AbortController` to be constructed — which is also what keeps
  `./core` loadable on a host that has none.
- **Server errors: `form.adoptIssues(issues)`.** The `setError` of this library,
  under a name that says what the runtime does with them. They are a **merge
  input to every pass** rather than a cell a pass overwrites, so one list feeds
  the issue cells, `errorCount` and submit's `blockedBy` and the three cannot
  disagree — writing `issuesCell(path)` by hand showed the message, was not
  counted, and did not block. They are dropped by a write at the path, at an
  ancestor or at a descendant; by `reset()`; and by the end of the next
  `submit()`, which that attempt was already refused by. Two presses with
  nothing changed between them always get through, which is what stops "the card
  was declined" — an issue on a path nobody can type into — from wedging the
  form for good.
- **`validateOn: "change" | "blur" | "submit"`,** on `createForm` and never on a
  field: one pass judges the whole root, so a field set to `"blur"` would be
  re-judged the moment any other field changed, and a per-field knob would be a
  promise this architecture cannot keep. After a *rejected* submit every setting
  judges on change again. `errorCount` therefore means "as of the last pass",
  which under `"submit"` is 0 until the first submit.
- **A file field.** `kind: "file"` is read off the **document**, not off a
  vendor: a binary string is `format: "binary"` (OpenAPI) or
  `contentEncoding: "binary"` (2020-12), and zod 4.6.1 writes both for
  `z.file()`. So the walk in `./resolver-standard` gives every Standard Schema
  vendor a file widget, and no resolver reaches a private member for one. It is
  a kind and not a format on `string` because the widget branch is chosen on
  `kind`, and a file input is the one input React cannot control — a format
  would have been drawn by the generic tail, which writes `String(value)`, i.e.
  `"[object File]"`, onto the element.
- **The `./react` entry carries `"use client"`,** so it imports into a Next App
  Router Server Component with no wrapper module of your own. It survives the
  build — there is no bundler in the publish path, and tsc 5.9.3 emits it as
  line 1 of `dist/react/index.js` and not into the `.d.ts`. It costs one Rollup
  warning for a non-Next consumer who bundles the built package (esbuild is
  silent, tree-shaking is unaffected, measured both ways), and it puts five
  non-hook exports behind a client boundary.
- **A swappable store.** Five members over an opaque key — per-key notification,
  the `Object.is` gate, synchronous delivery and read-your-writes in a batch are
  normative, and `assertFormStoreContract` ships to check them.
- **Nothing in the package compiles a string** — no `new Function`, no `eval`, and
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

**waypoint is behind on all four scenarios, at every size.** The report
says so in those words and prints the rows it loses before its own table. Who
beats it is the part worth reading: on two of the four the winning row wins by
**not showing the message** — one reports only at submit, one reports nothing at
all — and the other two are beaten by waypoint's own uncontrolled binding.

**`K5` is the scenario that says what coalescing is worth**, and it is new: five
characters typed into one field with ONE settle at the end, rather than a pass
drained after every keystroke. The design document had recorded that objection
as closed against a scenario nobody had written; it is written now, and the
answer is the same at all three sizes. At 201 fields both waypoint subjects
run **1 validator pass, 201 paths judged**, while react-hook-form, Formik,
TanStack Form and the hand-written reference each run **5 passes and 1005 paths
judged** — because drain-per-keystroke, which is all the other three scenarios
do, hands every subject its pass per character whether it asked for one or not,
and is the one arrangement in which coalescing can buy nothing.

**The counts lane is gated**, because commits, changed fibers, DOM mutations and
validator passes do not depend on the machine, so drift is never noise. **The
time lane is printed and never gated:** a keystroke at 201 fields measures 0.57×
the hand-written reference and the harness **refuses to call that a win**, the
difference being under the floor its own ladder resolved.

## Examples

```bash
npm run example:showcase        # http://localhost:5179
npm run example:nested-arrays   # http://localhost:5181
npm run docs:dev                # the documentation site, with the live form
```

`showcase` is a real application form — 23 inputs across six sections, drawn
with Tailwind and Material Design 3. `nested-arrays` writes the same
`shipments[] → address{} → lines[]` shape four times — waypoint,
react-hook-form, Formik, TanStack Form, one page, one schema, same markup, same
behaviour — so the only difference left is how a field two levels inside a list
says which row it belongs to. Both have their own README, and neither needs a
build: every example resolves the packages to their **source**.

## Where it stands

The runtime is complete against its design and is exercised by 270 tests, eight
compile-time programs — one of them whose only job is to prove that an
application registering nothing is refused rather than quietly unchecked — and a
screen that uses all of it. **Nothing has ever been published — the publish
workflow is manual-dispatch only and has never been run — and nobody has run
it in production.**

### Limits, stated rather than papered over

**The concrete path grammar has no escape**, so a field whose key contains a
dot cannot be addressed: `"a.b"` is read as `a` then `b`. An escape would have
to be understood by every path a vendor emits as well, and no vendor spells
one.

**Validation is proportional to the schema on every settled change.** The diff
keeps *notification* proportional to what moved, but the pass judges the whole
root, which is what a cross-field rule reporting elsewhere costs.

**A `Record<string, T>` member is addressable but undescribed.** Its keys do
not exist until there is a value and a descriptor is keyed by a declared path,
so there is no path a descriptor for `bag.<key>.label` could be keyed at: the
resolver emits the record as one leaf and `AutoForm` draws nothing for it. The
application draws it by hand with `useField` per key it knows about. The value
at `bag.anything.label` reads and writes correctly, and the path *is* checked —
`bag.anything.labell` is refused — but by `ValueAtPath` rather than by the path
union, because an index-signature key makes the union widen to the template
`` `bag.${string}` `` and TypeScript has no way to spell one dot-free segment
of `string`. So below a record's key nothing is suggested and a wrong path is
refused as `never` rather than by name. A list under a record's key keeps its
leaves — `bag.k.items[0].sku` compiles and `…skuu` does not — but `useRows`
refuses it, because `ArrayPath` needs a literal `[*]` member and the template
absorbed it.

**A field inside a union branch is described as optional whatever its branch
says.** The branches are flattened onto one prefix — `z.union([z.object({a}),
z.object({b})])` describes `who.a` and `who.b`, and a discriminated union's
discriminant carries every branch's value as its choices — but a descriptor
cannot make its requiredness conditional on a sibling's value, and
`FormFieldDescriptor` is not growing a member for it. The validator still
enforces the real rule, so the submit is refused correctly; only the asterisk
beside the label is missing. Two branches declaring the same key with different
types collapse to one descriptor and the first branch's spelling wins.

**There is no `debounceMs`.** One pass judges the whole root, so a delay on the
pass would delay the required-field message along with the network rule — which
is not a smaller version of what other libraries ship but a different and worse
thing. TanStack debounces *one async validator*, per cause, and forces the delay
to zero on submit (`@tanstack/form-core` 1.33.5, `dist/esm/utils.js` lines
180-215; only `getAsyncValidatorArray` reads the option, so a synchronous rule
is never delayed); there is no async-only validator here to attach a delay to.
Debounce inside your async rule, and use the `AbortSignal` second argument to
`validate` to cancel a superseded round trip.

**A file field is ONE file, and its byte bounds are not carried.** There is no
`multiple`: a multi-file pick is one event replacing a whole list at once, and
`rows()` offers append, remove and move with no replace-the-list edit to express
it — that is a change to the array runtime, not to the descriptor. And
`z.file().min(100)` emits `minLength: 100` where the bytes it means collide with
what `constraints.minLength` already means twice over (shortest string, fewest
array elements), so the bound is dropped rather than restated under a unit the
contract cannot say; the validator still enforces it. `accept` is not emitted
either — the MIME list does reach the document, as `contentMediaType`, but
`FormFieldConstraints` has no member meaning "the media types this takes" and
one browser attribute is not worth adding one for. Draw the `multiple` input
yourself and keep the list with `rows()`; spell `accept` yourself.

**There is no FormData decoder, no server-action integration and no RSC data
flow** — only the one prerequisite, `"use client"` on `./react`. Every input
already carries `name` set to its concrete path, so a `<form action={…}>`
posting them arrives at the server as flat string pairs keyed `owner.name` and
`items[0].quantity`, and `writeValueAt(root, path, next)` in `./core` already
takes a concrete path and builds the intermediate arrays and objects — so the
fold is small. What is not small is the policy: an unchecked checkbox sends **no
entry at all** and an untouched optional text field sends `""`, so absence has to
mean `false` for one descriptor kind and something else for another, and `""` has
to be declared to be either the empty string or an absent value. Getting either
wrong corrupts a submitted root quietly rather than failing. Decode it yourself,
or post JSON from `form.readRoot()`.

**There are no React Native bindings.** `./core` is genuinely portable — it
compiles with `lib: ["ES2020"]` and no DOM types, which is what the per-entry
tsconfig split exists to check — but the bindings are not: `inputProps` emits
`minLength`, `pattern` and `aria-describedby`, none of which RN's `TextInput`
accepts — `labelProps` carries an `htmlFor` with nothing to point at — and
`useUncontrolledField` writes `element.value` on an `HTMLInputElement`.
Closing it would take an eighth entry point whose
`buildTextInputProps` returned `{ value, onChangeText, onBlur }` and no
uncontrolled hook at all, plus a test lane this repository does not have — its
tests are `node --test` with jsdom. Until then: `./core`, and write the bindings.

**There is no devtools extension** — there is the seam one would be built on.
`createForm` takes a store, a store is five members over an opaque key, so a
store that records every write is an ordinary substitution rather than an
instrumentation hook. `docs-site/src/demo/recording-store.ts` is that store in
148 lines, and the documentation site runs it live under a form you can type
into. A devtools product is that file plus a panel plus a transport, and the
panel and the transport carry no architectural argument.

**A fixed-length tuple is one addressable value, not a row of them.**
`z.tuple([z.string(), z.number()])` is `pair`, and `pair[0]` does not compile.
A descriptor is keyed by the rule and every index is rewritten back to `[*]`
before any lookup, so a positional descriptor could never be found again; a
tuple's index is part of its shape, which the rule/place split has no way to
carry. A tuple with a *rest* element is a growable array again and keeps its
places — and its one descriptor is the rest element's, which is wrong for the
fixed prefix positions.

Every hook and component, with the signature the package emits, is on the
docs site's API page. `CLAUDE.md` carries the
naming rule this codebase is held to, and `docs/design/form-runtime.md` is the
design it was built from; sections 7 and 8 record what was rejected and why.

## License

MIT
