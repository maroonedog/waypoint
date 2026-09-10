# form-contract

**A form renderer needs to know what a field accepts before anyone types in
it. A validator knows, and has no way to say so.**

Validation contracts answer one question: is this value acceptable? That
answer arrives after a value exists, which is too late to decide whether to
draw a number input or a select, whether to put a required mark on a label, or
what to write in `minlength`.

This contract is the other half. A schema describes its fields; a renderer
draws them; neither knows which validator produced the description.

## The contract

A schema implements it by carrying one property:

```ts
interface StandardFormV1 {
  readonly "~form": {
    readonly version: 1;
    readonly vendor: string;
    readonly fields: () => readonly FormFieldDescriptor[];
  };
}
```

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

## Validators that do not implement it

A resolver describes a vendor's schemas from outside, so the description works
without the validator's cooperation:

```ts
import { resolveFormFields, eraseFormResolver } from "form-contract";
import { zodFormResolver } from "form-contract-resolver-zod";

const resolvers = [eraseFormResolver(zodFormResolver)];

const fields = resolveFormFields(
  z.object({ name: z.string().min(3), age: z.number().min(18) }),
  resolvers
);
// [
//   { path: "name", kind: "string", isRequired: true, constraints: { minLength: 3 } },
//   { path: "age",  kind: "number", isRequired: true, constraints: { minimum: 18 } },
// ]
```

Self-description wins over every resolver. The vendor that produced the schema
knows what it declared; a resolver reads the same schema from outside and can
only approximate it.

A schema nothing can describe raises `UnresolvableSchemaError` rather than
returning an empty list. A form with no declared fields renders nothing, and a
schema nobody understands is a wiring mistake — a caller that cannot tell them
apart ships the second one as the first.

## Packages

| Package | What it is |
|---|---|
| `form-contract` | The contract and the resolution entry point. No dependencies. |
| `form-contract-resolver-zod` | Describes a zod schema. Reads it structurally, so zod is not a dependency. |

## License

MIT
