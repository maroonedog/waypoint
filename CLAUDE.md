# Coding conventions

Rules here are enforced by a test, not left as sentences. A convention that
only exists in a document is one that degrades quietly — which is the same
argument `form-cell-store.types.ts` makes about its own contract.

## Naming

### `check` is not a name prefix

`checkField`, `checkValue`, `checkOwnRules` — none of these. The word names the
*act* and says nothing about the *answer*: a reader cannot tell whether the
function throws, returns a boolean, returns a list of problems, or writes
something on the way. Every name in this codebase is meant to state a fact, and
`check` states that somebody looked.

Name what it answers, or what it hands back. The codebase already does:

| Instead of | The repository writes |
|---|---|
| `checkAncestor` | `isAncestorPath` |
| `checkIssuesEqual` | `sameIssueList` |
| `checkBlocking` | `blockingOf` |
| `checkValueAt` | `readValueAt` |
| `checkPathExists` | `addressable.has` |

**Exception: a name imposed by a foreign interface.** zod's
`definition.checks` and the React DevTools hook's required `checkDCE` member are
other people's vocabulary being mirrored; renaming them would hide what they
correspond to. The rule governs names *we* choose. The test carries an explicit
allowlist so each exception has to be written down.

**Scope: identifiers** — functions, methods, variables, types, object members.
npm script names and file names (`bench:forms:check`, `tsconfig.check.json`) are
not identifiers and are out of scope.

Enforced by `test/naming-conventions.test.mjs`.

### Known exception, not yet resolved

`FieldHandle.check(candidate)` and `FieldBinding.check` predate this rule. They
are the bare word rather than a prefix, so the test does not fail on them — but
they have the problem the rule exists for: the name does not say that they
return issues and write nothing, which is why both carry a doc comment saying
so. Renaming them is a public API decision that has not been taken.
