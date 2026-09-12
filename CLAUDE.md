# Coding conventions

## Naming

### A name has to say what the thing does

**You must be able to tell what something does from its name at the call site —
without reading its comment, its signature, or its body.** A name that needs the
comment to be understood is not acceptable. It does not matter that the comment
is there and is correct: the comment is read once, the name is read every time.

This is the rule. Everything below is an instance of it.

#### What it rules out

**Naming the act instead of the answer.** `check`, `handle`, `process`, `do`.
They say somebody did something and leave the reader to find out what came back
— a boolean? a list of problems? nothing, but something got written?

**Words that are only meaningful next to their definition.** `at`, `mine`,
`near`, `report`, `settle`. Each of these was in this codebase, and each one
could only be read by scrolling up.

#### What to do instead

Say what it answers, or what it hands back. These are the renames that were
actually made when this rule was written down, and they are the pattern:

| Was | Is | Because |
|---|---|---|
| `field.check(candidate)` | `field.issuesFor(candidate)` | Says it returns issues. A noun phrase, so it reads as a question and not an action — which is also the fact that it writes nothing. It pairs with `field.issues`: now, versus if it were this. |
| `mine(produced)` | `atThisPath(produced)` | Says which issues come back. |
| `at(declaredPath, indices)` | `boundToRows(declaredPath, indices)` | Says what happens to the path. |
| `addressable.near(path)` | `addressable.similarTo(path)` | Says the result is a resemblance, not a distance. |
| `report(message)` | `warnOnHostConsole(message)` | Says where it goes, and that there may not be one. |
| `settle()` (scheduler) | `finishPass()` | Says which thing finished. |
| `settle(key)` (store) | `notifyOrDefer(key)` | Says both branches. |
| `checkDefinition` | `zodCheck` | Says whose it is. |

Names that already pass, for calibration: `isAncestorPath`, `sameIssueList`,
`blockingOf`, `readValueAt`, `expandDeclaredPath`, `distributeIssues`,
`refreshOpenAround`, `spliceRowCells`.

#### The exception

**A name imposed by a foreign interface.** zod's `definition.checks` and the
React DevTools hook's required `checkDCE` are other people's vocabulary being
mirrored; renaming them would hide what they correspond to. The rule governs
names *we* choose.

#### How much of this is enforced

`check` as a name prefix is banned by `test/naming-conventions.test.mjs`, which
also fails when an allowlisted foreign name stops being used. The rest of the
rule is not mechanically decidable — "does this name say what it does" is a
judgement — so it is enforced in review. When a bad name is found, rename it and
add the row to the table above, so the next reader calibrates against real
examples rather than adjectives.
