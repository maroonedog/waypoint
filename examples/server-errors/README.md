# Server errors, and what drops them

```bash
npm run example:server-errors  # http://localhost:5182
```

Two kinds of complaint reach one list. The schema judges the shape with the
value in front of it. The server judges what the schema cannot see — whether a
handle is taken, whether a card will be accepted — and its answer goes to
`adoptIssues`.

```tsx
await form.submit(async (root) => {
  const answer = await createAccount(root);
  if (!answer.ok) form.adoptIssues(answer.issues);   // inside the handler
});
```

## Why this is not `setError`

Every form library has a member that accepts a server's complaint, and in
every one of them it is a **cell** the next validation pass overwrites. Here it
is a **merge input to every pass**, and that is the whole design: the adopted
list is concatenated onto what the validator produced *before* the field cells
are written, before the count is published, and before the submit verdict is
computed. One list feeds all three, so they cannot come to disagree.

A message held in component state instead would be **shown but not counted and
not blocking** — a form that displays "declined" and submits anyway.

## The two rejections, and why they clear at different moments

| | `handle` | `payment` |
|---|---|---|
| declared by the schema | yes | **no** |
| drawn by an input | yes | **no** |
| shown where | on the field | only in the summary |
| blocks the submit | yes | **yes** |
| dropped by | editing that field | the end of the next submit |

`payment` is the case worth having an example for. No descriptor declares it,
so no field can display it — and it still refuses the submit, is still counted
by `useFormStatus()`, and is still named by `blockedBy` and `useErrorSummary()`.
Nothing anybody types is *about* it, so no edit can make it stale; the press
that clears it is the one that asks the server again.

Editing `handle` drops its message with no round trip, because a write at a
path makes a verdict about that path, its ancestors and its descendants stale.
"This row is a duplicate" does not survive an edit inside the row.

## To see it

Enter `ada` as the handle and a card number ending in `0`, then press the
button. Both complaints arrive. Now change the handle — that message goes on
its own. Change the card number — the decline stays, because it was never
about the digits. Press again and the server is asked afresh.
