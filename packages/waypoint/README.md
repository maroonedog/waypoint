# @maroonedog/waypoint

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

```bash
npm install @maroonedog/waypoint
```

ESM only. Node 20+. `react` and `zod` are optional peers: install React if you
import `/react`, install zod if you import `/resolver-zod`, and install neither
to use the runtime on its own.

## The one file nobody guesses

Paths are typed by a module augmentation, not by a prop. Write this once, in
your own source, and every hook in the application is checked — including
components that import nothing from it.

```ts
// src/form-registry.ts
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { orderSchema } from "./order-schema.js";

export const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint/react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}
```

`useField("billing.postcode")` now infers its value type, and
`useField("billing.postcod")` is a compile error. An application that registers
nothing is **refused** rather than quietly unchecked.

## Entry points

Seven, because they install together anyway — what the split buys is not bytes
but **resolution**. `./core` loads in a worker where React cannot be resolved
at all, and `./react` is the only entry whose built output names React.

| Entry | What you import from it |
|---|---|
| `@maroonedog/waypoint` | The contract and the path types: `FormAdapter`, `FormIssue`, `FieldPath`, `ConcretePath`, `PartlyBoundPath`, `InhabitedPath`. One runtime export, `isPending`. |
| `@maroonedog/waypoint/core` | The runtime: `createForm`, `createCellStore`, `assertFormStoreContract`. No React, no validator, no DOM. |
| `@maroonedog/waypoint/react` | `useField`, `useRows`, `useFormStatus`, `FormProvider`, `<Field>`, `<AutoForm>`. |
| `@maroonedog/waypoint/resolver-standard` | `standardFormResolver` — any validator that implements Standard Schema and its JSON Schema companion. Names no vendor. |
| `@maroonedog/waypoint/resolver-zod` | `zodFormResolver`: the above, plus the three facts zod's JSON Schema does not carry about zod. zod is a type-only import, erased at build time. |
| `@maroonedog/waypoint/resolver-luq` | `luqFormResolver`: the above, plus luq's issue codes and severities, which the spec has no member for. |
| `@maroonedog/waypoint/store-zustand` | `createZustandCellStore` — a shipped instance of the store contract `./core` exports. |

Source ships in the tarball alongside declaration maps, so Go-to-Definition
lands on the file that explains why the code is the way it is rather than on a
signature.

## What it does not do

This list is here because a capability list without one is an advertisement.
Each line says what it cannot do and what to reach for instead.

- **No `debounceMs`.** One pass judges the whole root, so a delay on the pass
  would delay the required-field message along with the network rule. Debounce
  inside your async rule; the optional second argument to `validate` is an
  `AbortSignal`, aborted the moment a newer pass starts, so a superseded round
  trip can stop rather than finish and be discarded.
- **No per-field `validateOn`.** `createForm` takes
  `"change" | "blur" | "submit"` for the whole form. One pass judges the whole
  root, so a field set to `"blur"` would be re-judged the moment any other
  field changed — a per-field knob would be a promise this runtime cannot keep.
- **No multi-file input, and no file byte or MIME constraint.**
  `kind: "file"` is one `File`: a multi-file pick replaces a whole list in one
  event, and `rows()` has append, remove and move with no replace-the-list
  edit. Byte bounds are dropped rather than carried under `minLength`, which
  already means characters and array elements. Draw the `multiple` input and
  the `accept` attribute yourself, and keep the list with `rows()`.
- **No FormData decoder, no server actions, no RSC data flow.** `./react`
  carries `"use client"`, so it imports into a Server Component without a
  wrapper; and every input already carries `name` set to its concrete path, so
  a posted form arrives as flat pairs keyed `owner.name` and
  `items[0].quantity`. Nothing here folds them back into a root, because an
  unchecked checkbox sends no entry at all and an untouched optional field
  sends `""` — and both need a policy this package will not guess. Decode it
  yourself, or post JSON from `form.readRoot()`.
- **No React Native bindings.** `./core` has no DOM and is portable; the
  bindings are not — `inputProps` emits `minLength`, `pattern` and
  `aria-describedby`, and `useUncontrolledField` writes an `HTMLInputElement`.
  Use `./core` and write the bindings.
- **No devtools extension.** There is the seam one would be built on:
  `createForm` takes a store, a store is five members over an opaque key, so a
  store that records every write is an ordinary substitution rather than an
  instrumentation hook. The documentation site runs one, in 148 lines, under a
  form you can type into.

The repository's README carries the rest, including the limits of the path
grammar and of describing a union branch.

## Where it stands

Nobody has run this in production yet. The full argument, the measurements and
the benchmark are in
[the repository](https://github.com/maroonedog/form-contract); the
documentation site is in `docs-site/` and is not served anywhere yet.

MIT.
