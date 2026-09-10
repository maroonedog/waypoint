# form-contract

**A form renderer needs to know what a field accepts before anyone types in
it. A validator knows, and has no way to say so.**

Validation answers one question: is this value acceptable? That answer arrives
after a value exists, which is too late to decide whether to draw a number
input or a select, whether to put a required mark on a label, or what to write
in `minlength`.

This contract is the other half, and it is one function.

## The contract

```ts
type FormResolver<TSchema, T, TPath extends string = string> =
  (schema: TSchema) => FormAdapter<T, TPath>;

interface FormAdapter<T, TPath extends string = string> {
  readonly fields: readonly FormFieldDescriptor[];
  validate(root: unknown): readonly FormIssue[];
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

## The type survives

`T` is the form's value type and `TPath` the paths that may be addressed, so a
misspelt path is a compile error rather than a field that silently never
renders.

```ts
import { zodFormResolver } from "form-contract-resolver-zod";
import type { FormPaths, FormValues } from "form-contract";

const adapter = zodFormResolver(
  z.object({ owner: z.object({ email: z.string() }) })
);

type Values = FormValues<typeof adapter>;   // { owner: { email: string } }
type Paths  = FormPaths<typeof adapter>;    // "owner" | "owner.email"

const good: Paths = "owner.email";
const typo: Paths = "owner.emial";          // compile error
```

Carrying the type is also what keeps the contract neutral about direction. A
type-first validator passes the type its rules were written against; a
schema-first one passes what its schema infers. Both arrive as the same form.

## Describing and judging

```ts
const adapter = zodFormResolver(z.object({ name: z.string().min(3) }));

adapter.fields;
// [{ path: "name", kind: "string", isRequired: true, constraints: { minLength: 3 } }]

adapter.validate({ name: "ab" });
// [{ path: "name", message: "…", code: "too_small" }]
```

An issue is addressed at the **concrete** path it belongs to —
`items[1].quantity`, never `items[*].quantity`. A wildcard describes the shape;
an issue is about one value.

`validate` judges the whole root rather than one field, which is what lets a
rule comparing two fields report against either of them.

## Packages

| Package | What it is |
|---|---|
| `form-contract` | The contract and the path types. No dependencies. |
| `form-contract-resolver-zod` | Describes and judges a zod schema. zod is a type-only import, erased at build time. |

## Path types

`FieldPath<T>` yields the paths of a value type: dots for members, `[*]` for
array elements, and array members are never enumerated — which removes
`items.name`, `items[0].name`, `tags.length` and `items.map` with one rule.
Built-ins stop a path, so `when.getTime` is not a field.

Recursion is bounded, so a self-referential model yields a finite union rather
than a compiler error. A vendor that tracks which paths were actually declared
should publish those instead; this exists for the vendors that do not.

## License

MIT
