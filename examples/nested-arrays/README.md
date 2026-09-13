# Arrays and nesting, in one form — four implementations

```bash
npm run example:nested-arrays  # http://localhost:5181
```

`shipments[] → address{} → lines[]`. An array holding an object holding another
array. **The same zod schema, the same markup and the same controls**, written
four times — with waypoint, react-hook-form, Formik and TanStack Form. The only
thing that differs is **how a field says which row it belongs to**.

All four were run, not just compiled: the first paint (nine inputs, two cards,
three line rows each), emptying the deepest leaf `shipments[0].lines[0].sku`
and seeing the error appear on that row alone, and adding and removing rows of
the inner array while the surviving rows keep their own values.

---

## What is counted, and where the numbers live

Each panel's heading carries two figures, and **the page counts them from that
panel's own file** every time it loads — `?raw` in, counted in `ui.tsx`, never
typed by hand. They were typed by hand once and one of them was wrong, in this
project's favour, which is the good reason for the numbers not to live in this
file either.

- **lines** — non-blank lines that are not whole-line comments.
- **`shipments`** — how many times the word appears in those lines. This is the
  one that matters: it is how often the code has to restate the nesting, and it
  is the cost of addressing, made countable.

Open the page for the current figures. The part that is a fact about each
library rather than about one file:

| | inner array needs its own component? |
|---|---|
| waypoint | no |
| react-hook-form | **yes — the library requires it** |
| Formik | no |
| TanStack Form | no |

**waypoint is not the shortest of the four.** On lines it sits close to
react-hook-form and can come out above it. Line count is the metric that is
easiest to publish and the easiest to mislead with, so it is not the claim.
The claim is the column above and the `shipments` count.

---

## How each one addresses a field

### waypoint — a row hands out its own address

```tsx
{shipments.rows.map((shipment) => (
  <div key={shipment.key}>
    <Text at={`${shipment.path}.address.postcode`} label="Postcode" />
    <Lines at={shipment.path} />          {/* the inner list is not told where it is */}
  </div>
))}

function Lines({ at }) {
  const lines = useRows(`${at}.lines`);   // a concrete path; being "inner" never comes up
  ...
}
```

`row.path` is `form:shipments[0]`. The inner list does not know that it is
inner. **There is no nested-array API** — `useRows` takes a concrete path, so
the inner list simply uses the address the outer row already handed it. That
address is one string carrying the form's name as well, so there is nothing to
pass alongside it.

### react-hook-form — the inner array must be its own component

```tsx
function Lines({ at }: { at: number }) {          // ← the split the library requires
  const { fields, append, remove } = useFieldArray({
    control, name: `shipments.${at}.lines`,
  });
  ...
  <input {...register(`shipments.${at}.lines.${index}.sku`)} />
  {formState.errors.shipments?.[at]?.lines?.[index]?.sku?.message}
```

`useFieldArray` is a hook, so it cannot be called inside a loop, and the inner
`name` depends on the outer index — which only exists inside the map. **This is
not a split the screen wanted; it is one the library demands** (its own
documentation says "nested field array, you will have to use a separate
component").

Errors are walked by hand: `errors.shipments?.[at]?.lines?.[index]?.sku`.
**Misspell any of it and there is no type error** — the expression is
`undefined`, which reads as "no error here", and nothing appears.

### Formik — no split required, but the string is written twice

```tsx
<FieldArray name={`shipments.${index}.lines`}>
  ...
  <Field name={`shipments.${index}.lines.${at}.sku`} />
  {message(getIn(errors, `shipments.${index}.lines.${at}.sku`))}
```

`<FieldArray>` is a render prop, so it can be written inline and no component
split is forced. Instead **the same path is written twice** — once for `Field`,
once for `getIn` — and nothing checks that the two agree.

Two more costs belong to this shape alone:

- **`validationSchema` is unusable here.** `prepareDataForValidation` rewrites
  every `""` to `undefined` before validating, so a legitimately empty zod field
  grows an `expected string, received undefined`. So `validate` is
  hand-written, and **zod's issue paths are rebuilt into the nested shape Formik
  reads** — deciding at each segment whether to make an array or an object. Get
  it wrong and nothing throws; you just build an error nobody reads.
- **`getIn` on a container returns the children's error array.** Rendering that
  directly takes the page down with `Objects are not valid as a React child`
  (this implementation hit it). It is guarded by checking for a string.

### TanStack Form — the schema goes straight in, the addressing is strings

```tsx
<form.Field name={`shipments[${index}].lines`} mode="array">
  {(lines) => lines.state.value.map((_line, at) => (
    <form.Field name={`shipments[${index}].lines[${at}].sku`}>
      {(field) => <input value={field.state.value} ... />}
```

The schema is passed as-is, as a Standard Schema — TanStack accepts the same
contract this repository builds on, so no adapter is needed. `form.Field` is a
component, so it can be written inside the map and no split is forced. The
field's state and its errors arrive together in the render prop, so **there is
no error object to walk by hand**, which is the difference from
react-hook-form.

`mode="array"` is required on a list. Without it, one edit inside a row
re-renders the whole list.

---

## What this can and cannot show

It shows **the cost of addressing**, and nothing else. These four files measure
no performance — that is `bench/`'s job, and the CI-measured result is in
`docs/measurements-forms-time.md`.

Line count is not simply "lower is better", either. Formik is long mostly
because the zod bridge is hand-written; with yup it would be shorter. **But that
is only true once you give up choosing your validator**, which is the premise
this repository is arguing about.

The advantage this library can honestly claim here is one thing: **the inner
array never has to know that it is inner.** In the other three, a field inside
the inner list needs the outer index to exist.
