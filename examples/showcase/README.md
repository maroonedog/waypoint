# Showcase — お取引口座 開設申込

A reference screen for the runtime, drawn with Tailwind and Material Design 3.
It is a real form: personal details, a company, two addresses, an order table
and terms — 23 inputs across six sections.

```bash
node node_modules/vite/bin/vite.js --config examples/showcase/vite.config.ts examples/showcase
```

The packages resolve to their **source**, so editing the runtime reloads the
page with no build step in between.

## What it demonstrates

| In the screen | In the library |
|---|---|
| Every field is a `<Field>` with a children function | Layer 3. The widgets here are the application's, and none of them ships with the library |
| `AddressFields` is written once and placed twice | `<FieldScope prefix="billing">` and `prefix="shipping"` bind local names to a place |
| 「請求先と同じ」 hides the shipping address | `<FieldScope participating={false}>` — the values stay in the store and stop counting toward what blocks a submit |
| The order table adds, removes and renumbers rows | `<FieldRows>` and `<FieldScope row>`; row ids are React keys, cell keys stay concrete indices |
| 「合計が上限を超えています」 | An array-level issue at `items`, read with `useFieldIssues("items")` — a path with no descriptor |
| The required marker and `minlength` on each input | `field.descriptor` — the schema said it, the widget drew it, nobody wrote it twice |
| The submit bar counts what blocks | `useFormStatus()` — four cells, four subscriptions |
| Submitting reports what stopped it | `form.submit()` returns `blockedBy`, including paths with no component on screen |

## The MD3 layer

`src/theme.css` holds the colour roles as plain custom properties and lets the
Tailwind theme reference them with `@theme inline`, so the dark scheme is one
block of overrides rather than a second set of utilities on every element.

`src/md/` holds the widgets: filled text field, number field, select, filter
chips, checkbox, button and section card. They are ordinary components that
take a `FieldBinding`, which is the same thing a children function receives.

One note worth keeping: a Material Symbols ligature does not form inside a
flex container, so the round icon badge and the glyph cannot be the same
element.
