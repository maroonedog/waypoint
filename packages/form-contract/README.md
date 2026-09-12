# @maroonedog/form-contract

**A field's address exists before the component that draws it — as a type the
compiler has already checked, and as runtime state that is already written.**

```bash
npm install @maroonedog/form-contract
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
import { zodFormResolver } from "@maroonedog/form-contract/resolver-zod";
import { orderSchema } from "./order-schema.js";

export const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/form-contract/react" {
  interface FormTypeRegistry {
    form: typeof orderAdapter;
  }
}
```

`useField("billing.postcode")` now infers its value type, and
`useField("billing.postcod")` is a compile error. An application that registers
nothing is **refused** rather than quietly unchecked.

## Entry points

Six, because all six install together anyway — what the split buys is not bytes
but **resolution**. `./core` loads in a worker where React cannot be resolved
at all, and `./react` is the only entry whose built output names React.

| Entry | What you import from it |
|---|---|
| `@maroonedog/form-contract` | The contract and the path types: `FormAdapter`, `FormIssue`, `FieldPath`, `AddressablePath`. One runtime export, `isPending`. |
| `@maroonedog/form-contract/core` | The runtime: `createForm`, `createCellStore`, `assertFormStoreContract`. No React, no validator, no DOM. |
| `@maroonedog/form-contract/react` | `useField`, `useRows`, `useFormStatus`, `FormProvider`, `<Field>`, `<AutoForm>`. |
| `@maroonedog/form-contract/resolver-zod` | `zodFormResolver`. zod is a type-only import, erased at build time. |
| `@maroonedog/form-contract/resolver-luq` | `luqFormResolver`, through the JSON Schema luq already produces. |
| `@maroonedog/form-contract/store-zustand` | `createZustandCellStore` — a shipped instance of the store contract `./core` exports. |

Source ships in the tarball alongside declaration maps, so Go-to-Definition
lands on the file that explains why the code is the way it is rather than on a
signature.

## Where it stands

Nobody has run this in production yet. The full argument, the measurements and
the benchmark are in
[the repository](https://github.com/maroonedog/form-contract); the
documentation site is in `docs-site/` and is not served anywhere yet.

MIT.
