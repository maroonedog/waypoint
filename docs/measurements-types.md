# Typed addressing, measured — compiler lane

Typed addressing is what this library leads with: a `FormTypeRegistry`
augmentation, `ConcretePath<P>` for a place and `PartlyBoundPath<P>` for a
column, and a leaf component
that gets a compile-checked path with nothing passed down to it. This document
is what that costs the compiler, taken with the compiler's own accounting.

Every figure is a **delta**, and every one of them is **printed rather than
gated**. §6 is the measurement behind that decision.

## §0 — What was measured, and what this harness cannot see

`npm run bench:types` writes one throwaway TypeScript program per row into a
temporary directory and compiles it with `tsc --extendedDiagnostics --noEmit`.
Each program holds a root type of the stated shape, a
`FormAdapter<Root, FieldPath<Root>>`, the
`declare module "@maroonedog/waypoint/react"`
augmentation that registers it, and one addressing call per leaf — `useField`
for a place and `useFieldValues` for a rule, which is how the library itself
divides them. The
imports resolve to `packages/waypoint/src`, so what is measured is the type this
repository maintains rather than a `.d.ts` that may predate the last edit.

Leaf counts are **counted** off the generated program, never computed as
`branch ** depth`. That is not pedantry. The depth-8 rows have every leaf
they contain truncated out of the path union by `PathDepthBudget`, and a table
that printed the arithmetic would rank those rows as the most expensive in the
sweep rather than as the unusable ones they are. The `addressable` column is
how many of the counted leaves the hook actually accepted.

**What it cannot see.**

| not visible here | why |
|---|---|
| editor latency | This is a batch compile. What a person experiences is the language service answering one file against a warm program, and a slow hover is a worse outcome than the same delay added to a `tsc` run nobody watches. This lane measures the one nobody watches. |
| the `.d.ts` an installed package exposes | The programs resolve to `src`. The emitted declarations are generated from these same types, but the resolution path differs and this lane does not walk it. |
| anything `skipLibCheck` skips | On, because that is what `test/types-source/tsconfig.json` uses, and a measurement taken under options nobody compiles with is a measurement of nothing. |
| the cost of one more FILE | Every row is a single-file program. A real application spreads its addressing calls over hundreds of files; the per-call figures here are what a call costs once its file is already in the program. |
| `Memory used` as a peak | One sample, after a collection, at the end of the run. |
| any other library | Nothing here is a comparison. react-hook-form's path types are not in this sweep, so this document states no number about them and none should be read out of it. |

## §1 — The floors

Both are subtracted out of every delta below, and both are printed so a reader
can put them back.

| program | instantiations | types | Check time | Memory used |
|---|---|---|---|---|
| `empty` — lib.d.ts and nothing else | 0 | 85 | 0.00s | 78 MB |
| `packages-only` — both packages imported, no shape | 6,691 | 4,563 | 0.56s | 101 MB |

`empty` is what every TypeScript program in the world pays. `packages-only` is
the `.` and `./react` entries type-checking their own source: an application
pays it once, and it does not move when the form grows. Neither is a cost of
typed addressing, and an absolute figure that silently contains both is how two
honest people measuring the same thing end up an order of magnitude apart.

## §2 — Depth, at branching factor 3

`building the union` is the delta over `packages-only` for a program that makes
**no calls at all**. `FieldPath<Root>` sits in a type annotation, so the
compiler constructs the union whether or not anything addresses the form; that
is the cost paid in whatever file declares the adapter. The call columns are
deltas over that same program, so they are the cost of ADDRESSING with the
union already built. Splitting the two is the whole point of the lane: at depth
7 they differ by a factor of 6,169, and a single figure that mixes them can be argued to
almost any value — which is how this cost came to have three published ones.

`interfaces` is the axis a synthetic probe gets wrong by accident.
`interface L2 { m0: L1; m1: L1; m2: L1 }` gives the compiler one subtree to walk
and memoise. A real schema gives it three different ones, because `applicant`
and `company` are not the same object. Both are here, and at depth 1 they are
the same program — the two rows reading identically is the control.

| shape | leaves (counted) | addressable | interfaces | building the union | per addressable leaf | Check time, 0 calls | 1 call | every leaf | per call |
|---|---|---|---|---|---|---|---|---|---|
| `depth-1-distinct` | 3 | all 3 | 1 | +862 | 287 | 0.56s | +52 | +154 | 51.3 |
| `depth-1-shared` | 3 | all 3 | 1 | +862 | 287 | 0.63s | +52 | +154 | 51.3 |
| `depth-2-distinct` | 9 | all 9 | 4 | +2,375 | 264 | 0.56s | +63 | +559 | 62.1 |
| `depth-2-shared` | 9 | all 9 | 2 | +2,241 | 249 | 0.59s | +63 | +559 | 62.1 |
| `depth-3-distinct` | 27 | all 27 | 13 | +7,254 | 269 | 0.65s | +74 | +1,972 | 73.0 |
| `depth-3-shared` | 27 | all 27 | 3 | +6,284 | 233 | 0.65s | +74 | +1,972 | 73.0 |
| `depth-4-distinct` | 81 | all 81 | 40 | +22,825 | 282 | 0.69s | +85 | +6,805 | 84.0 |
| `depth-4-shared` | 81 | all 81 | 4 | +18,913 | 233 | 0.65s | +85 | +6,805 | 84.0 |
| `depth-5-distinct` | 243 | all 243 | 121 | +72,254 | 297 | 0.91s | +96 | +23,086 | 95.0 |
| `depth-5-shared` | 243 | all 243 | 5 | +59,082 | 243 | 0.70s | +96 | +23,086 | 95.0 |
| `depth-6-distinct` | 729 | all 729 | 364 | +228,603 | 314 | 1.23s | +107 | +77,275 | 106.0 |
| `depth-6-shared` | 729 | all 729 | 6 | +187,217 | 257 | 0.96s | +107 | +77,275 | 106.0 |
| `depth-7-distinct` | 2187 | all 2187 | 1093 | +721,720 | 330 | 1.72s | +118 | +255,880 | 117.0 |
| `depth-7-shared` | 2187 | all 2187 | 7 | +595,258 | 272 | 1.61s | +118 | +255,880 | 117.0 |
| `depth-8-distinct` | 6561 | **0** | 3280 | +723,904 | n/a — none is | 2.19s | +346,069 | +372,309 | 56.7 |
| `depth-8-shared` | 6561 | **0** | 8 | +595,258 | n/a — none is | 1.37s | +346,069 | +372,309 | 56.7 |

**The growth is linear in leaves, not exponential in depth.** Depth is only where the leaves come from. Per addressable leaf the union costs 287 instantiations at depth 1 against 330 at depth 7 — a factor of 1.1 across a shape 729 times larger.
Distinct subtrees cost 1.21× shared ones at depth 7 and 1.22× at depth 5, which
is the size of the error a probe makes by reusing one interface per level.

**Then it stops.** `depth-8-distinct` builds its union in 723,904 instantiations against `depth-7-distinct`'s 721,720 — 2,184 more, 0.3%, while the shared arm does not move at all (595,258 at both depths). The budget stopped the
compiler before the eighth segment, so the union stopped growing with it — and none of that
shape's 6,561 leaves got into it either. §7 is what that costs instead.

**A refused call is the expensive one.** A call the path type accepts costs 117.0 instantiations at depth 7. The single refused call in `depth-8-distinct` costs 346,069 — 2,958 times an accepted one, and 0.48× what building the whole
union cost — because the compiler elaborates the union into the error message.
That is a fact about mistyped paths in an editor, not about correct code.

## §3 — Width, at depth 1

| shape | leaves (counted) | addressable | interfaces | building the union | per addressable leaf | Check time, 0 calls | 1 call | every leaf | per call |
|---|---|---|---|---|---|---|---|---|---|
| `width-30` | 30 | all 30 | 1 | +4,507 | 150 | 0.59s | +52 | +1,531 | 51.0 |
| `width-100` | 100 | all 100 | 1 | +13,957 | 140 | 0.61s | +52 | +5,101 | 51.0 |
| `width-300` | 300 | all 300 | 1 | +40,957 | 137 | 0.70s | +52 | +15,301 | 51.0 |

Flat and linear: 150, 140 and
137 instantiations per leaf across a tenfold range. Width is
not where this gets expensive.

## §4 — Arrays, records and a cyclic model

`array-declared` addresses `items[*].tags[*].label` as a COLUMN, through
`useFieldValues` and `PartlyBoundPath`; `array-concrete` addresses the same root
by PLACE, through `useField` and `ConcretePath` — every wildcard replaced by
that leaf's own ordinal, so no two calls share a literal and the compiler
cannot answer one from another. The two hooks rather than one because the
library divides them that way: a rule has no answer at `useField`, so measuring
it there would be measuring a compile error. `record-member` carries a
`Record<string, Entry>`. `self-referential` is a node that contains itself.

| shape | leaves (counted) | addressable | interfaces | building the union | per addressable leaf | Check time, 0 calls | 1 call | every leaf | per call |
|---|---|---|---|---|---|---|---|---|---|
| `array-declared` | 10 | all 10 | 5 | +4,726 | 473 | 0.64s | +67 | +954 | 95.4 |
| `array-concrete` | 10 | all 10 | 5 | +4,726 | 473 | 0.70s | +67 | +925 | 92.5 |
| `record-member` | 5 | all 5 | 2 | +1,354 | 271 | 0.64s | +54 | +472 | 94.4 |
| `self-referential` | 10 | **7** | 1 | +3,187 | 455 | 0.67s | +52 | +1,707 | 170.7 |

The two array rows are the same root compiled twice, and their
`building the union` figures came back identical — so the difference between
them is entirely in what a CALL costs. Addressing by place runs 92.5 instantiations per call against 95.4 by rule, 0.97×: the
two are within a few instantiations of each other, which is worth saying
plainly because the obvious guess is that they would not be. `ConcretePath`
makes a place MATCH a template literal instead of being found in a union of
literals; `PartlyBoundPath` keeps each wildcard or binds it, so a two-wildcard
leaf offers four members rather than one. Neither dominates here. Most of what
both figures carry is `InhabitedPath`, which every call in this sweep pays —
§7's record paragraph is where that is priced.

### Where the budget truncates

`PathDepthBudget` is a type alias in
`packages/waypoint/src/contract/path-depth.types.ts`.
Its value is not restated here: a number copied out of a file is the kind of
claim this lane exists to stop making. This is where the compiler actually
stops, MEASURED by handing `useField` one path
per hop down a self-referential root and recording which ones came back refused.

| hops below the root | path | segments | useField accepts it |
|---|---|---|---|
| 0 | `name` | 1 | yes |
| 1 | `child.name` | 2 | yes |
| 2 | `child.child.name` | 3 | yes |
| 3 | `child.child.child.name` | 4 | yes |
| 4 | `child.child.child.child.name` | 5 | yes |
| 5 | `child.child.child.child.child.name` | 6 | yes |
| 6 | `child.child.child.child.child.child.name` | 7 | yes |
| 7 | `child.child.child.child.child.child.child.name` | 8 | **no** — TS2345 |
| 8 | `child.child.child.child.child.child.child.child.name` | 9 | **no** — TS2345 |
| 9 | `child.child.child.child.child.child.child.child.child.name` | 10 | **no** — TS2345 |

**7 segments are addressable; 8 are not.**
`child.child.child.child.child.child.name` is accepted and `child.child.child.child.child.child.child.name` is not.

### Every diagnostic the sweep produced

| code | shapes that produced it, and how many calls it refused in each |
|---|---|
| `TS2345` | `depth-8-distinct` (6561), `depth-8-shared` (6561), `self-referential` (3) |

**TS2589** — "Type instantiation is excessively deep and possibly infinite" —
was produced by no shape in this sweep, the self-referential root and the depth-8 tree included. That is the budget doing its job: `path-depth.types.ts` says it exists so a cyclic model yields a long path union rather than TS2589, and this is the measurement behind that sentence rather than a restatement of it.

## §5 — The escape hatch, measured

§7 recommends making a subtree opaque, so here is what that does rather than a
claim that it works. `opaque-2-of-3` is `depth-6-distinct` with two of the
root's three subtrees retyped: their members are still declared and still typed,
so the value keeps its shape, but the interface extends `ReadonlyMap` — one of
`OpaqueObject`'s arms — and `FieldPath` stops there.

| shape | leaves (counted) | addressable | interfaces | building the union | per addressable leaf | Check time, 0 calls | 1 call | every leaf | per call |
|---|---|---|---|---|---|---|---|---|---|
| `depth-6-distinct` | 729 | all 729 | 364 | +228,603 | 314 | 1.23s | +107 | +77,275 | 106.0 |
| `opaque-2-of-3` | 245 | all 245 | 364 | +78,807 | 322 | 0.76s | +107 | +25,861 | 105.6 |

The two rows declare the same
364 interfaces and carry the same
data, which is the point of putting them side by side: nothing was deleted. The
`leaves (counted)` column is the paths the generator emitted a call for, and
the opaque rows keep the rest of their leaves under `m1` and `m2` where no path
reaches them.

The union drops from 228,603 instantiations to 78,807 — a 66% saving — and the per-leaf
figure barely moves (314 against 322), which is what says the
saving is exactly the paths given up rather than a discount on the rest. `m1`
and `m2` themselves stay nameable, with nothing under them: a component can
still address the container and a component below it cannot. That is the whole
trade.

## §6 — Why this lane is printed and not gated

`Instantiations` is the compiler's own count and not a stopwatch. It is a
function of the program and the compiler, so unlike the time lane it does not
move when the machine does. That is a real difference and it deserved a
measurement rather than an assumption: the same program, 3 separate
`tsc` processes.

| compile | instantiations | types | Check time | Memory used | wall clock |
|---|---|---|---|---|---|
| 1 | 102,031 | 8,021 | 0.84s | 109 MB | 1795 ms |
| 2 | 102,031 | 8,021 | 0.91s | 109 MB | 1895 ms |
| 3 | 102,031 | 8,021 | 0.98s | 109 MB | 2019 ms |

Instantiations came back identical all 3 times. Check time spread 16.7% over that same identical work, which is why the time columns in this document are context and never an argument.

**A gate was still not added, and the reason is the compiler rather than the
machine.** `typescript` is a devDependency at a caret range. The figures here
were taken with 5.9.3, and a patch bump rewrites every one of them
without anybody touching a type. A budget that gets re-recorded on sight is not
a budget, it is a changelog with an exit code — and the failure it would
produce points at `npm update` rather than at the change that made a type
worse, so the next reader learns to ignore it. The determinism is real and it is
why this lane can publish counts at all; it is not on its own a reason to fail a
build. The size lane gates because a bundle is a shipped artifact whose budget
survives a toolchain bump. An instantiation count is not, and does not.

What would make it justifiable: `typescript` pinned exactly in
`devDependencies`, so that a moved number means a moved type. Pin it and the
gate can be added — one budget file beside this harness, the shape of
`run-size-bench.ts`'s — and this section deleted along with the argument.

## §7 — Where this becomes unacceptable, and what a user does

**Not depth, and not the per-call cost.** Depth stops mattering at the budget — the §2 figures are 721,720 at depth 7 and 723,904 at depth 8 — and a call costs 51.0 instantiations at width 300 and 117.0 at depth 7. A thousand
components addressing one large form is not where this goes wrong.

**What goes wrong at depth is that the fields stop being addressable.** Every one of `depth-8-distinct`'s 6,561 leaves is refused. A form nested past 7 segments does not
compile slowly; it stops type-checking its own fields. It does so loudly, which
is the one mercy here: 346,069 instantiations for the FIRST refused call, because
the compiler elaborates the whole union into the message. An editor is where a
person meets that, not CI.

**What goes wrong at size is the union, built once per shape.** For plain objects it is 137–330 instantiations per leaf, rising with depth; a leaf under an array costs more (`array-declared` is 473). It is paid in
whatever file declares the adapter. A form of a few hundred leaves is tens of
thousands of instantiations and unremarkable. A generated schema with tens of
thousands of leaves is not, and this is the figure to multiply.

In the order to try them:

1. **Keep the form inside 7 segments.** Free, and it is what
   the budget is for. Nesting below that is not checked, so it should not be
   built.
2. **Move `PathDepthBudget`.** It is one number in one file. Lowering it cuts
   the union's cost directly and truncates the deep paths; raising it does the
   reverse, and the depth rows above say what raising it buys — past the leaf
   count the budget already reaches, cost and nothing else.
3. **Make the subtree you do not address opaque.** `OpaqueObject` is the escape
   hatch: anything assignable to it ends a path, so a member whose interface
   extends one of its arms leaves the union along with everything under it,
   while keeping its own members and its own type. §5 is the measurement —
   228,603 instantiations down to
   78,807 for two of three subtrees, which is
   what the paths given up were costing.
4. **Register an adapter typed `string`.** `ConcretePath<string>` is
   `string`, so the union collapses entirely and the form goes back to
   unchecked paths — one line of the application's own registration, which is
   already what a schema built at run time does.

**And one case where the union is not the check.** A `Record<string, T>` member
is cheap to build — the `record-member` row is 1,354 instantiations — because
`Extract<keyof Record<string, Entry>, string>` is `string`, so the union grows a
TEMPLATE member rather than literal ones. That template is a SUPERTYPE of
everything beneath it, so the union absorbs the record's whole subtree and
stops refusing anything below the key: this sweep's `byId.a1b2c3.amount` names
a key nothing declares and is accepted, which is right, and `byId.a1b2c3.amountt`
was accepted too, which was not.

The second one is refused now, and not by the union — there is no way to spell
one dot-free segment of `string`. `InhabitedPath` is intersected into the path
parameter and asks `ValueAtPath`, which walks the path segment by segment and
answers `never` for a leaf the record's value type does not have.

It is paid on EVERY call and not only the ones under a record, which is the
honest way to price it: `record-member` costs 94.4 instantiations per call
against `array-concrete`'s 92.5 and `width-300`'s 51.0 — the record row is not
the expensive one. This sweep cannot show a before and after, so the delta was
taken separately, with `tsc --extendedDiagnostics` over one flat 30-member root
and 30 calls, the same declaration with and without the intersection:
206,864 against 208,278 instantiations, **+47.1 per call**. That is what the
per-call columns here rose by.

What is still missing under a record is the ERROR, not the checking — no
completion is offered below the key, and a wrong path is refused as `never`
rather than by name, because the constraint the compiler quotes is still the
union. `test/types-containers/container-shapes.type-test.ts` pins both halves.

## §8 — What was run on

| what | value |
|---|---|
| typescript | 5.9.3 |
| compiler options | `test/types-source/tsconfig.json`'s, plus `types: []` and `baseUrl` so the floor is `lib.d.ts` alone |
| node | v23.11.0 |
| @types/react | 19.3.0 |
| machine | AMD Ryzen 7 5825U with Radeon Graphics, 16 cores, 15.3 GB, win32 10.0.26200 |
| programs compiled | 77 |
| run took | 2.7 minutes |

**Machine-dependent in the time and memory columns, compiler-dependent in every
column.** Check time and Memory used move with the machine; instantiations and
types move with `typescript`. That is the reason this lane is printed and not
gated, and the reason to re-run `npm run bench:types` rather than quote this
file against a different toolchain.
