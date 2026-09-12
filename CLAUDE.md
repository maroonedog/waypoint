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

## Addresses nobody owns

**No domain is registered for this project, and none may be invented.** Do not
add `docs-site/public/CNAME`, and do not write a domain into Astro's `site`,
a README link, a workflow title or an `og:url`.

The reason this is a rule and not a preference: `formcontract.dev` was written
into a CNAME, into `site` and into seven README links, and it answered
NXDOMAIN the whole time. **A CNAME naming a domain nobody owns does not fail
loudly** — GitHub Pages accepts it and then serves nothing at an address that
does not exist, so the failure looks like "the site is not deployed yet" rather
than like a mistake. The same string in `site` puts a dead `og:url` on every
page. Both survived a full technology review before anybody checked the DNS.

`site` has to hold something, because `@astrojs/sitemap` refuses to run
without it. It holds the GitHub Pages address for the repository as actually
named, with a comment saying it is a placeholder. Whoever registers a domain
changes that line and puts the CNAME back, in a commit that says so.

Registering a domain is the author's decision. So is the product's name, and so
is the repository's — an agent may propose one and must not write one in.

## Sentences a comment may not contain

A comment here is an argument about why something is the way it is. That is a
claim about a DESIGN, and a design holds still. Four kinds of sentence are
claims about the TREE instead, and the tree moves under them:

- **A count of occurrences.** "appears four times in the sibling", "five cases",
  "two files build their own document". Every one of these was true when it was
  written.
- **A superlative across files.** "the only one here that throws", "the one test
  that does not import the library", "nothing else needs this yet".
- **A claim about another file's contents.** "error-summary.test.mjs makes its
  claim through `document.activeElement`" — written about a file that, after a
  split, contained no `activeElement` at all.
- **A measurement without a run behind it.** `test/bench-verdict.test.mjs` said
  its rule "came out of a real CI run: waypoint measured 0.537x the hand-written
  reference". `0.537` appears in no recording in any revision of this
  repository. It was the file's own synthetic fixture value, narrated as
  history, and it shipped.

Say why instead. "A hand-written issue cell was shown, not counted, and did not
block" is about a defect and will read the same in a year. "Two of the thirteen
tests below ask something else" is about a file and is one commit from false.

**If a claim will not verify, delete the sentence.** Do not soften it into
something vaguer that is technically true: a sentence that survives by being
vague costs a reader the same attention and returns nothing.

This is a rule rather than advice because it has now failed twice under direct
instruction. A test refactor shipped twelve false claims of these kinds; the
round that repaired it, told to run every claim before writing it, shipped nine
more. Both rounds verified diligently and both produced the same genus, which
is what says the problem is the sentence shape rather than the care taken.
