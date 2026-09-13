# Two forms, one page, one set of inputs

```bash
npm run example:two-forms  # http://localhost:5183
```

Both forms declare `owner.email` and mean different things by it. Both screens
draw it with the **same component**, which imports neither schema, receives no
handle and takes one prop.

```tsx
// shared-fields.tsx imports nothing from either form.
function Text({ at, label }: { at: FormPathTo<string>; label: string }) {
  const field = useField(at);
  ...
}

<Text at="customer:owner.email" label="Email" />
<Text at="admin:owner.email"    label="Owner email" />
```

## What the prefix is for

Registration is global to the compilation, so with two forms registered the
name `owner.email` is genuinely ambiguous — there is no answer a runtime could
pick that would not be wrong half the time. The prefix is the field's own
address saying which form it belongs to, so the value type is read out of *that*
form rather than out of every registered form at once.

With one form registered the prefix is optional. It becomes required the moment
a second one appears, and that is a compile error rather than a silent choice.

## What does not compile

`src/refusals.tsx` holds the compiler to it. Every call in that file carries
`@ts-expect-error`, so `npm run test:types` fails if any of them ever starts
compiling:

- `owner.email` — ambiguous, two forms are registered
- `customer:quotas.seats` — `seats` belongs to the other form
- `admin:owner.emial` — a near miss on a real path
- `admin:tenant` handed to the number component — `tenant` is a string
- `billing:owner.email` — no form is registered under that name

## What the type does not promise

`FormPathTo<string>` is every registered place whose value is a string, **across
every registered form**. So a second screen's place also satisfies the prop; the
type does not say the path belongs to the form this component happens to be
rendered under. What the prefix buys is that the provider compares the name at
run time and throws, instead of drawing an input that belongs to nobody.

## One thing this example exposes

Open the page and read the two email inputs:

```
id="_r_1_owner.email"  name="owner.email"     ← the customer form
id="_r_4_owner.email"  name="owner.email"     ← the admin form
```

**`id` is scoped and `name` is not.** Ids come from React's `useId`, so the two
never collide and every `<label for>` and `aria-describedby` points at the
right control. The `name` attribute carries the path unqualified, so two forms
on one page put two different fields into the submission namespace under one
name. Django has prefixed formset field names for exactly this reason since
formsets existed.

Values are addressed by path in the store and never read back out of `name`,
so nothing this runtime does depends on it. What does depend on it is
`useErrorSummary`: it sends a reader to a control by `name`, and with two
`owner.email` inputs in one document the search needs to be told where to
start. That is `scopeProps`, and both screens here use it:

```tsx
const summary = useErrorSummary();
<section {...summary.scopeProps}> … </section>
```

Break the email on both screens and press each **Go to the first problem**:
each one lands inside its own section. Leave `scopeProps` off and the search
falls back to the whole document, where the other form's field is the
plausible answer.

What is still unprefixed is `name` itself, which matters to a native
`<form>` submission and to anything downstream that reads it. That is not
done yet.
