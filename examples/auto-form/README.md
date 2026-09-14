# AutoForm, and how to change what it draws

```bash
npm run example:auto-form  # http://localhost:5186
```

It also runs on the documentation site, at `/examples/`, mounted from these
same files. The reason to run it here instead is that the package resolves to
its source, so an edit inside `src/react` reloads the page.

`<AutoForm />` draws every declared field in declaration order through a widget
table. No component in this example is written for a particular field. What
each input looks like is decided by which rung of the table it matched, and
`resolve-widget.ts` tries the rungs most specific first:

| rung | matched on | the field that lands on it here |
| --- | --- | --- |
| `byName` | a name the caller wrote as `<Field as="compact" />` | reachable only from a hand-written `Field` — AutoForm never writes `as` |
| `byPath` | this exact **declared** path | `notes`, and `lines[*].qty` for every row |
| `byFormat` | the constraint the validator named | `email` |
| `choices` | the field is closed | `priority` |
| `byKind` | `string \| number \| boolean \| date \| file \| array \| object` | `seats`, `giftWrap` |
| `fallback` | everything else | `reference`, `lines[*].sku` |

The row worth staring at is `lines[*].qty`. **One entry covers every row**,
because the lookup matches the declared path — keyed by `lines[0].qty` it would
cover exactly one row and would be pointing at the wrong one as soon as
somebody inserted one.

## The three screens

**Everything, drawn by the table.** Eight inputs, no per-field component, and a
`renderList` for the chrome around the order lines — the heading, the add
button, the remove button. AutoForm draws the rows; what surrounds them is not
something a library can know.

**Most of it drawn, one field written.** `only` names the top-level
declarations AutoForm should draw, and what it leaves out is ordinary layer-3
code in the same provider — here `priority` as three buttons rather than a
select. There is no `partial` on the provider: between them the two halves
address every declared field, so the coverage check has nothing to report.

**The same form, a different table.** One button swaps the registry for the
smallest one that still draws this form honestly. Nothing below the provider is
re-mounted or re-written, and the values stay where they are: the store never
knew which component was drawing them. What survives the swap is the point —
the plain inputs still come out `type="email"`, `type="number"`, `required`
and inside the schema's bounds, because all of that is on `inputProps` and
`inputProps` is built from the descriptor. A widget chooses the control; the
descriptor decides what the control is told.

The one rung that has to stay is `byKind.boolean`, and that is the rule for
when a field needs its own: a checkbox's value is `checked`, not `value`, so a
text widget cannot serve it without drawing a box that does not follow the
field.

## What it costs

`AutoForm` reads its paths out of the descriptor tree and splices row indices
into them at run time, so this is the one layer of the library where a path is
not checked by the compiler. It is the layer that exists to draw a form nobody
wrote component code for, and a path only means something to check where
somebody typed one — the hand-written `<Field path="auto:priority">` on the
second screen is checked exactly as it would be anywhere else.
