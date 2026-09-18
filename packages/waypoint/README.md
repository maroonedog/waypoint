# @maroonedog/waypoint

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

```bash
npm install @maroonedog/waypoint
```

ESM only. Node 20+. TypeScript 5.9+ is the tested compiler baseline.
Validator and framework packages are optional peers: install the
framework whose entry you import, install zod if you import `/resolver-zod`,
and install none of them to use the runtime on its own. The Luq resolver requires
`@maroonedog/luq@^2.9.0`, including when partial execution is disabled.

## React quick start

```bash
npm install @maroonedog/waypoint react react-dom zod
```

```tsx
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { FormProvider, useCreateForm, useField } from "@maroonedog/waypoint/react";

const schema = z.object({ email: z.email() });
const adapter = zodFormResolver(schema);
declare module "@maroonedog/waypoint" {
  interface WaypointForms { contact: typeof adapter }
}

function Email() {
  const field = useField("contact:email");
  return <>
    <label {...field.labelProps}>Email</label>
    <input {...field.inputProps} />
    <span {...field.errorProps}>{field.issues[0]?.message}</span>
  </>;
}

export function App() {
  const form = useCreateForm(() => ({
    key: "contact", adapter, defaultValues: { email: "" },
  }));
  return <FormProvider form={form}>
    <form noValidate onSubmit={event => {
      event.preventDefault();
      void form.submit(values => { console.log(schema.parse(values)); });
    }}>
      <Email />
      <button type="submit">Save</button>
    </form>
  </FormProvider>;
}
```

### Valibot

Install `valibot` and `@valibot/to-json-schema` when importing `/resolver-valibot`.

```ts
import * as v from "valibot";
import { valibotFormResolver } from "@maroonedog/waypoint/resolver-valibot";

const adapter = valibotFormResolver(v.object({
  email: v.pipe(v.string(), v.email()),
}));
```

Descriptors use the official JSON Schema converter. Valibot issue types become
typed `issue.code` values. Forms retain input values; parse in your submit handler
if you need transformed output. Async schemas require `{ fields }`, which can be
taken from `valibotFormResolver(syncShape).fields`. Explicit fields also cover
types such as Date that JSON Schema cannot describe. All issues are collected,
regardless of global abort settings. Optional `validation` options allow message
and language configuration; abort flags cannot be overridden.

**zod 4.2.0 is the floor, and the reason is measured.** The resolver reads
`~standard.jsonSchema`, the Standard Schema JSON Schema companion, and zod
ships it from 4.2.0: on 4.1.12 that property is `undefined`, on 4.2.0 it is an
object. Under a zod that does not have it, `zodFormResolver` describes no
fields at all — the form renders inputs with no type, no bounds and no aria,
and the only signal is one console line. The peer range used to admit that.

## The one file nobody guesses

Paths are typed by a module augmentation, not by a prop. Write this once, in
your own source, and every hook in the application is checked — including
components that import nothing from it.

```ts
// src/waypoint-forms.ts
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { orderSchema } from "./order-schema.js";

export const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    form: typeof orderAdapter;
  }
}
```

`useField("billing.postcode")` now infers its value type, and
`useField("billing.postcod")` is a compile error. An application that registers
nothing is **refused** rather than quietly unchecked.

## Entry points

Reusable packages should export adapters and shared controls without augmenting
`WaypointForms` from their ordinary entry. Register forms in application source
and use qualified paths when sharing components. An incompatible duplicate key
is rejected when declarations are checked, but `skipLibCheck` can suppress
conflicts inside dependency declarations. Global registration is not isolation.

The entry points install together — what the split buys is not bytes
but **resolution**. `./core` loads in a worker where React cannot be resolved
at all, and `./react` is the only entry whose built output names React.

| Entry | What you import from it |
|---|---|
| `@maroonedog/waypoint` | The contract, the registry and the path types: `FormAdapter`, `FormIssue`, `WaypointForms`, `FormPath`, `FormPathTo`, `FieldPath`, `ConcretePath`. **`declare module` goes here.** One runtime export, `isPending`. |
| `@maroonedog/waypoint/core` | The runtime: `createForm`, `createCellStore`, `assertFormStoreContract`. No React, no validator, no DOM. |
| `@maroonedog/waypoint/react` | `useField`, `useRows`, `useFormStatus`, `FormProvider`, `<Field>`, `<AutoForm>`. |
| `@maroonedog/waypoint/vue` | `useField`, `useRows`, `useFormStatus`, `FormProvider`, `<Field>`, `<FieldRows>` for Vue 3, against the SAME registry — the `declare module` names the package, not a binding. It carries no `<AutoForm>`, no uncontrolled binding and no error summary yet; everything they are built on is reachable through `useForm()`. |
| `@maroonedog/waypoint/resolver-standard` | `standardFormResolver` — any validator that implements Standard Schema and its JSON Schema companion. Names no vendor. |
| `@maroonedog/waypoint/resolver-zod` | `zodFormResolver`: the above, plus the three facts zod's JSON Schema does not carry about zod. zod is a type-only import, erased at build time. |
| `@maroonedog/waypoint/resolver-luq` | `luqFormResolver`: the above, plus luq's issue codes and severities, which the spec has no member for. |
| `@maroonedog/waypoint/resolver-valibot` | `valibotFormResolver`: Valibot descriptors, native issue codes and optional partial execution. Requires `valibot` and `@valibot/to-json-schema`. |
| `@maroonedog/waypoint/store-zustand` | `createZustandCellStore` — a shipped instance of the store contract `./core` exports. |

Source ships in the tarball alongside declaration maps, so Go-to-Definition
lands on the file that explains why the code is the way it is rather than on a
signature.

## What it does not do

This list is here because a capability list without one is an advertisement.
Each line says what it cannot do and what to reach for instead.

- **Partial execution is opt-in.** Use `zodFormResolver(schema, { partial: true })`
  to validate selected top-level subtrees on edits and field validation. Root
  refinements fall back to full validation; submit always validates everything.
  `form.validate(["email"])` requests scopes explicitly. Custom adapters can
  implement `validatePartial` with complete replacement scopes and dependency
  expansion. Valibot also supports `{ partial: true }` for object schemas;
  root pipes and unsupported shapes use full validation. With Luq 2.9+, use
  `luqFormResolver(schema, { partial: true, dependencies: { password: ["confirmation"] } })`;
  declare cross-subtree dependencies explicitly. Standard Schema remains whole-form.
- **No `debounceMs`.** A pass can include synchronous and async rules, so a delay on the pass
  would delay the required-field message along with the network rule. Debounce
  inside your async rule; the optional second argument to `validate` is an
  `AbortSignal`, aborted the moment a newer pass starts, so a superseded round
  trip can stop rather than finish and be discarded.
- **No per-field `validateOn`.** `createForm` takes
  `"change" | "blur" | "submit"` for the whole form. A partial pass can include
  dependent fields, so the trigger and the visibility of each field's errors
  are separate settings.
- **No multi-file input, and no file byte or MIME constraint.**
  `kind: "file"` is one `File`: a multi-file pick replaces a whole list in one
  event, and `rows()` has insert, remove and move with no replace-the-list
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
  instrumentation hook. The documentation site runs one under a
  form you can type into.

The repository's README carries the rest, including the limits of the path
grammar and of describing a union branch.

## Where it stands

This is the initial 0.1.0 release line. Production adoption is not established;
APIs may change during 0.x. Registration is global to a TypeScript program, not
isolated per package or Provider. Multiple installed waypoint versions and
declaration-bundler rewrites have not been validated. Keys containing dots are
not supported by the path grammar. Source and declaration maps ship in the
package. The repository is public and its documentation site is at
<https://maroonedog.github.io/waypoint/>.

MIT.
