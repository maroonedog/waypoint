# One form, three screens

```bash
npm run example:wizard  # http://localhost:5184
```

It also runs on the documentation site, at `/examples/`, mounted from these
same files. The reason to run it here instead is that the package resolves
to its source, so an edit inside `src/core` reloads the page.

A wizard is not several forms. It is one value, judged as a whole, shown a
piece at a time. The schema here has a rule that compares a field on step 1
with a field on step 3 — which no arrangement of three separate forms could
express.

## Nothing is lifted, merged or stored per step

Every declared path is written at `createForm`, before any component exists, so
a step nobody has opened already holds its values. Stepping forward mounts
components onto cells that were already correct; stepping back loses nothing.
There is no per-step store and no merge at the end.

Type something on step 1, go to step 3, come back.

## `partial`, and why it is not `useParticipation`

Once a `<FormProvider>`'s subtree has mounted it asks whether every declared
field reached a component. On step 1 the honest answer is no, and the runtime
cannot tell "the next step" from "the field somebody forgot" — both are
declared and both are absent. Only the screen knows which, so it says so:

```tsx
<FormProvider form={form} partial>
```

That silences **that one report** and nothing else. A path the form does not
declare is still reported from underneath.

`useParticipation` answers a different question. It changes what **blocks**, and
a wizard does not want that: step 3 must refuse the final submit even while
nobody has seen it. So its subtree stays in play, and `Next` asks about the
step in front of it by filtering `blockedBy` by prefix — the same list the
submit is refused by, rather than a second idea of what is wrong.

## The submit judges the whole root

A wizard that submits because the offending field was on another screen is the
defect this prevents. Leave step 2 empty, go to step 3 and press **Book it**:
it is refused, and `blockedBy` names the paths — including the ones on screens
you never opened.
