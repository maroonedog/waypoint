# Registry composition before publication

Keep the application-wide registry. Applications own augmentation; reusable
packages export adapters and components without automatically registering forms.
Use qualified paths in reusable application code so adding a second form does
not invalidate previously unqualified addresses. A scoped registry API is deferred
until an integration demonstrates a need that this pattern cannot meet.

```ts
import { adapter as checkout } from "@company/checkout";
import { adapter as inventory } from "@company/inventory";

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    checkout: typeof checkout;
    inventory: typeof inventory;
  }
}
```

Shared React controls can accept `FormPathTo<string>` and call `useField(path)`.
Their declarations retain that type reference; the consuming application's
registry supplies the addresses. A package does not need a dummy registration
to build this component. Do not export an augmentation from its ordinary entry.
Use simple application-owned keys: punctuation in keys is not a namespace API.

## Regression coverage and finding

`test/registry-composition.test.mjs` creates independent package declarations,
emits a shared control without a registered form, then compiles a consuming
application against the built waypoint declarations. It checks:

- Importing an adapter alone leaves the application unregistered.
- Two adapters preserve their distinct value types through qualified paths.
- A shared text input refuses a number field and misspelled paths are rejected.
- Unqualified addresses are rejected after a second form is registered.
- Conflicting dependency registrations are diagnosed with declaration checking.
- `skipLibCheck` suppresses that dependency-declaration conflict.
- A dependency augmentation still registers a form for its consumer.

The experiment found that `FormAdapter<T, TPath>` did not retain those parameters
in its structural members. Incompatible registrations could merge without an
error even with declaration checking enabled. An optional, type-only unique-symbol
member now retains the value and path types. Existing object-literal adapters do
not need another property and no runtime state is allocated. Assignments that
previously erased incompatible value/path types may now fail deliberately; this
is a type compatibility change.

The strengthened identity also exposed a real collision in the documentation
site: its AutoForm signup demo and imported server-errors example registered
different shapes under `signup`. The AutoForm demo now owns `autoSignup`.

This cannot make augmentation local or force dependency checking with
`skipLibCheck`. Keep registration in application source, review dependencies that
augment the registry, and run a declaration-checking consumer in package CI.
Runtime Provider checks remain necessary: types cannot infer where a component
will be mounted.

The normal test uses workspace-emitted declarations and synthetic package boundaries.
`npm run verify:package` also runs it against the tarball installed in a separate
application. Neither covers multiple installed waypoint versions or declaration
bundlers that rewrite imports.
No production adoption is claimed.
