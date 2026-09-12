// ===========================================================================
// run-types-bench.ts — the compiler lane, end to end.
//
// Command: `npm run bench:types`. It generates a throwaway TypeScript program
// per shape, compiles each with `tsc --extendedDiagnostics --noEmit` against
// the packages' SOURCE, and writes `docs/measurements-types.md`.
//
// PRINTED, not gated, exactly as the time lane is — but for a different reason,
// and the document's §6 gives the measurement behind it rather than the
// assertion. `Instantiations` is deterministic and the repeats say so; what is
// not pinned is the compiler, and a lane that fails the build on a `typescript`
// patch bump gets re-recorded on sight, which is the same thing as not
// checking.
//
// Every sentence below that contains a number interpolates it out of the run.
// A paragraph that quotes a figure by hand is a paragraph that goes stale on
// the next sweep and nobody notices, which is exactly how this cost came to
// have three different published values in the first place.
// ===========================================================================
import { writeFileSync } from "node:fs";
import { describeMachine } from "./env/describe-machine.ts";
import { readInstalledVersion } from "./env/read-installed-version.ts";
import { installedTypeScriptVersion } from "./types/measure-with-tsc.ts";
import { sweepTypeShapes } from "./types/sweep-type-shapes.ts";
import {
  addressableLeaves,
  renderBudgetTruncation,
  renderContainerShapes,
  renderDepthSweep,
  renderDiagnosticCodes,
  renderEscapeHatch,
  renderFloors,
  renderRepeats,
  renderWidthSweep,
} from "./types/render-type-tables.ts";

const REPORT = new URL("../docs/measurements-types.md", import.meta.url);
const REPEATS = 3;

const grouped = (value: number): string => value.toLocaleString("en-US");

const result = sweepTypeShapes((line) => console.log(line), REPEATS);
const typescript = installedTypeScriptVersion();
const machine = describeMachine();

const rowFor = (id: string) => {
  const found = result.rows.find((row) => row.shape.id === id);
  if (found === undefined) throw new Error(`${id} is not in the sweep`);
  return found;
};

const buildCost = (id: string): number =>
  rowFor(id).baseline.instantiations - result.packagesOnly.instantiations;
const perLeaf = (id: string): number => {
  // A shape whose every leaf was truncated has no per-leaf cost, and dividing
  // anyway prints "Infinity" into a published document. The table guards this
  // in its own cell; the prose has to as well.
  const reachable = addressableLeaves(rowFor(id));
  if (reachable === 0) {
    throw new Error(`${id} has no addressable leaf, so it has no per-leaf cost`);
  }
  return Math.round(buildCost(id) / reachable);
};
const perCall = (id: string): string => {
  const row = rowFor(id);
  const every = row.everyLeaf.instantiations - row.baseline.instantiations;
  return (every / row.shape.leafPaths.length).toFixed(1);
};
const refusedCallCost = (id: string): number =>
  rowFor(id).oneCall.instantiations - rowFor(id).baseline.instantiations;

const distinctOverShared = (depth: number): string =>
  (buildCost(`depth-${depth}-distinct`) / buildCost(`depth-${depth}-shared`))
    .toFixed(2);

const truncation = rowFor("self-referential");
const refusedHere = (path: string): boolean =>
  truncation.refusedLeaves.some((refused) => refused.path === path);
const firstRefused = truncation.shape.leafPaths.find(refusedHere);
const deepestAccepted = [...truncation.shape.leafPaths]
  .reverse()
  .find((path) => !refusedHere(path));
const acceptedSegments =
  deepestAccepted === undefined ? 0 : deepestAccepted.split(".").length;

const instantiationValues = new Set(
  result.repeated.map((measured) => measured.instantiations)
);
const typeCheckTimes = result.repeated.map(
  (measured) => measured.typeCheckSeconds
);
const typeCheckSpread =
  Math.round(
    ((Math.max(...typeCheckTimes) - Math.min(...typeCheckTimes)) /
      Math.min(...typeCheckTimes)) *
      1000
  ) / 10;

const sawDeepInstantiation = result.rows.some((row) =>
  row.refusedLeaves.some((refused) => refused.code === "TS2589")
);

const report = `# Typed addressing, measured — compiler lane

Typed addressing is what this library leads with: a \`FormTypeRegistry\`
augmentation, \`AddressablePath<P> = P | ConcretePath<P>\`, and a leaf component
that gets a compile-checked path with nothing passed down to it. This document
is what that costs the compiler, taken with the compiler's own accounting.

Every figure is a **delta**, and every one of them is **printed rather than
gated**. §6 is the measurement behind that decision.

## §0 — What was measured, and what this harness cannot see

\`npm run bench:types\` writes one throwaway TypeScript program per row into a
temporary directory and compiles it with \`tsc --extendedDiagnostics --noEmit\`.
Each program holds a root type of the stated shape, a
\`FormAdapter<Root, FieldPath<Root>>\`, the
\`declare module "@maroonedog/form-contract/react"\`
augmentation that registers it, and one \`useField(...)\` call per leaf. The
imports resolve to \`packages/form-contract/src\`, so what is measured is the type this
repository maintains rather than a \`.d.ts\` that may predate the last edit.

Leaf counts are **counted** off the generated program, never computed as
\`branch ** depth\`. That is not pedantry. The depth-8 rows have every leaf
they contain truncated out of the path union by \`PathDepthBudget\`, and a table
that printed the arithmetic would rank those rows as the most expensive in the
sweep rather than as the unusable ones they are. The \`addressable\` column is
how many of the counted leaves \`useField\` actually accepted.

**What it cannot see.**

| not visible here | why |
|---|---|
| editor latency | This is a batch compile. What a person experiences is the language service answering one file against a warm program, and a slow hover is a worse outcome than the same delay added to a \`tsc\` run nobody watches. This lane measures the one nobody watches. |
| the \`.d.ts\` an installed package exposes | The programs resolve to \`src\`. The emitted declarations are generated from these same types, but the resolution path differs and this lane does not walk it. |
| anything \`skipLibCheck\` skips | On, because that is what \`test/types-source/tsconfig.json\` uses, and a measurement taken under options nobody compiles with is a measurement of nothing. |
| the cost of one more FILE | Every row is a single-file program. A real application spreads its \`useField\` calls over hundreds of files; the per-call figures here are what a call costs once its file is already in the program. |
| \`Memory used\` as a peak | One sample, after a collection, at the end of the run. |
| any other library | Nothing here is a comparison. react-hook-form's path types are not in this sweep, so this document states no number about them and none should be read out of it. |

## §1 — The floors

Both are subtracted out of every delta below, and both are printed so a reader
can put them back.

${renderFloors(result)}

\`empty\` is what every TypeScript program in the world pays. \`packages-only\` is
the \`.\` and \`./react\` entries type-checking their own source: an application
pays it once, and it does not move when the form grows. Neither is a cost of
typed addressing, and an absolute figure that silently contains both is how two
honest people measuring the same thing end up an order of magnitude apart.

## §2 — Depth, at branching factor 3

\`building the union\` is the delta over \`packages-only\` for a program that makes
**no calls at all**. \`FieldPath<Root>\` sits in a type annotation, so the
compiler constructs the union whether or not anything addresses the form; that
is the cost paid in whatever file declares the adapter. The call columns are
deltas over that same program, so they are the cost of ADDRESSING with the
union already built. Splitting the two is the whole point of the lane: at depth
7 they differ by a factor of ${grouped(
  Math.round(
    buildCost("depth-7-distinct") / Number(perCall("depth-7-distinct"))
  )
)}, and a single figure that mixes them can be argued to
almost any value — which is how this cost came to have three published ones.

\`interfaces\` is the axis a synthetic probe gets wrong by accident.
\`interface L2 { m0: L1; m1: L1; m2: L1 }\` gives the compiler one subtree to walk
and memoise. A real schema gives it three different ones, because \`applicant\`
and \`company\` are not the same object. Both are here, and at depth 1 they are
the same program — the two rows reading identically is the control.

${renderDepthSweep(result)}

**The growth is linear in leaves, not exponential in depth.** Depth is only where the leaves come from. Per addressable leaf the union costs ${perLeaf("depth-1-distinct")} instantiations at depth 1 against ${perLeaf("depth-7-distinct")} at depth 7 — a factor of ${(perLeaf("depth-7-distinct") / perLeaf("depth-1-distinct")).toFixed(1)} across a shape ${grouped(rowFor("depth-7-distinct").shape.leafPaths.length / rowFor("depth-1-distinct").shape.leafPaths.length)} times larger.
Distinct subtrees cost ${distinctOverShared(7)}× shared ones at depth 7 and ${distinctOverShared(5)}× at depth 5, which
is the size of the error a probe makes by reusing one interface per level.

**Then it stops.** \`depth-8-distinct\` builds its union in ${grouped(buildCost("depth-8-distinct"))} instantiations against \`depth-7-distinct\`'s ${grouped(buildCost("depth-7-distinct"))} — ${grouped(buildCost("depth-8-distinct") - buildCost("depth-7-distinct"))} more, ${((buildCost("depth-8-distinct") / buildCost("depth-7-distinct") - 1) * 100).toFixed(1)}%, while the shared arm does not move at all (${grouped(buildCost("depth-8-shared"))} at both depths). The budget stopped the
compiler before the eighth segment, so the union stopped growing with it — and none of that
shape's ${grouped(rowFor("depth-8-distinct").shape.leafPaths.length)} leaves got into it either. §7 is what that costs instead.

**A refused call is the expensive one.** A \`useField\` the path type accepts costs ${perCall("depth-7-distinct")} instantiations at depth 7. The single refused call in \`depth-8-distinct\` costs ${grouped(refusedCallCost("depth-8-distinct"))} — ${grouped(Math.round(refusedCallCost("depth-8-distinct") / Number(perCall("depth-7-distinct"))))} times an accepted one, and ${(refusedCallCost("depth-8-distinct") / buildCost("depth-8-distinct")).toFixed(2)}× what building the whole
union cost — because the compiler elaborates the union into the error message.
That is a fact about mistyped paths in an editor, not about correct code.

## §3 — Width, at depth 1

${renderWidthSweep(result)}

Flat and linear: ${perLeaf("width-30")}, ${perLeaf("width-100")} and
${perLeaf("width-300")} instantiations per leaf across a tenfold range. Width is
not where this gets expensive.

## §4 — Arrays, records and a cyclic model

\`array-declared\` addresses \`items[*].tags[*].label\`; \`array-concrete\` addresses
the same root by PLACE — every wildcard replaced by that leaf's own ordinal, so
no two calls share a literal and the compiler cannot answer one from another —
which is the \`ConcretePath\` half of \`AddressablePath\`. \`record-member\` carries a
\`Record<string, Entry>\`. \`self-referential\` is a node that contains itself.

${renderContainerShapes(result)}

The two array rows are the same root compiled twice, and their
\`building the union\` figures came back identical — so the difference between
them is entirely in what a CALL costs. Addressing by place runs ${perCall("array-concrete")} instantiations per call against ${perCall("array-declared")} by rule, ${(Number(perCall("array-concrete")) / Number(perCall("array-declared"))).toFixed(2)}×. \`ConcretePath\`
produces a template literal, so a place has to be MATCHED against one rather
than found in a union of literals, and that is what naming a row costs.

### Where the budget truncates

\`PathDepthBudget\` is a type alias in
\`packages/form-contract/src/contract/path-depth.types.ts\`.
Its value is not restated here: a number copied out of a file is the kind of
claim this lane exists to stop making. This is where the compiler actually
stops, MEASURED by handing \`useField\` one path
per hop down a self-referential root and recording which ones came back refused.

${renderBudgetTruncation(result)}

**${acceptedSegments} segments are addressable; ${acceptedSegments + 1} are not.**
\`${deepestAccepted ?? "n/a"}\` is accepted and \`${firstRefused ?? "n/a"}\` is not.

### Every diagnostic the sweep produced

${renderDiagnosticCodes(result)}

**TS2589** — "Type instantiation is excessively deep and possibly infinite" —
${
  sawDeepInstantiation
    ? "was produced. The table above says by which shape."
    : "was produced by no shape in this sweep, the self-referential root and the depth-8 tree included. That is the budget doing its job: `path-depth.types.ts` says it exists so a cyclic model yields a long path union rather than TS2589, and this is the measurement behind that sentence rather than a restatement of it."
}

## §5 — The escape hatch, measured

§7 recommends making a subtree opaque, so here is what that does rather than a
claim that it works. \`opaque-2-of-3\` is \`depth-6-distinct\` with two of the
root's three subtrees retyped: their members are still declared and still typed,
so the value keeps its shape, but the interface extends \`ReadonlyMap\` — one of
\`OpaqueObject\`'s arms — and \`FieldPath\` stops there.

${renderEscapeHatch(result)}

The two rows declare the same
${rowFor("opaque-2-of-3").shape.interfaceCount} interfaces and carry the same
data, which is the point of putting them side by side: nothing was deleted. The
\`leaves (counted)\` column is the paths the generator emitted a call for, and
the opaque rows keep the rest of their leaves under \`m1\` and \`m2\` where no path
reaches them.

The union drops from ${grouped(buildCost("depth-6-distinct"))} instantiations to ${grouped(buildCost("opaque-2-of-3"))} — a ${(100 - (buildCost("opaque-2-of-3") / buildCost("depth-6-distinct")) * 100).toFixed(0)}% saving — and the per-leaf
figure barely moves (${perLeaf("depth-6-distinct")} against ${perLeaf("opaque-2-of-3")}), which is what says the
saving is exactly the paths given up rather than a discount on the rest. \`m1\`
and \`m2\` themselves stay nameable, with nothing under them: a component can
still address the container and a component below it cannot. That is the whole
trade.

## §6 — Why this lane is printed and not gated

\`Instantiations\` is the compiler's own count and not a stopwatch. It is a
function of the program and the compiler, so unlike the time lane it does not
move when the machine does. That is a real difference and it deserved a
measurement rather than an assumption: the same program, ${REPEATS} separate
\`tsc\` processes.

${renderRepeats(result)}

${
  instantiationValues.size === 1
    ? `Instantiations came back identical all ${REPEATS} times. Check time spread ${typeCheckSpread}% over that same identical work, which is why the time columns in this document are context and never an argument.`
    : `Instantiations came back with ${instantiationValues.size} distinct values across ${REPEATS} runs, which settles the question on its own.`
}

**A gate was still not added, and the reason is the compiler rather than the
machine.** \`typescript\` is a devDependency at a caret range. The figures here
were taken with ${typescript}, and a patch bump rewrites every one of them
without anybody touching a type. A budget that gets re-recorded on sight is not
a budget, it is a changelog with an exit code — and the failure it would
produce points at \`npm update\` rather than at the change that made a type
worse, so the next reader learns to ignore it. The determinism is real and it is
why this lane can publish counts at all; it is not on its own a reason to fail a
build. The size lane gates because a bundle is a shipped artifact whose budget
survives a toolchain bump. An instantiation count is not, and does not.

What would make it justifiable: \`typescript\` pinned exactly in
\`devDependencies\`, so that a moved number means a moved type. Pin it and the
gate can be added — one budget file beside this harness, the shape of
\`run-size-bench.ts\`'s — and this section deleted along with the argument.

## §7 — Where this becomes unacceptable, and what a user does

**Not depth, and not the per-call cost.** Depth stops mattering at the budget — the §2 figures are ${grouped(buildCost("depth-7-distinct"))} at depth 7 and ${grouped(buildCost("depth-8-distinct"))} at depth 8 — and a call costs ${perCall("width-300")} instantiations at width 300 and ${perCall("depth-7-distinct")} at depth 7. A thousand
components addressing one large form is not where this goes wrong.

**What goes wrong at depth is that the fields stop being addressable.** Every one of \`depth-8-distinct\`'s ${grouped(rowFor("depth-8-distinct").shape.leafPaths.length)} leaves is refused. A form nested past ${acceptedSegments} segments does not
compile slowly; it stops type-checking its own fields. It does so loudly, which
is the one mercy here: ${grouped(refusedCallCost("depth-8-distinct"))} instantiations for the FIRST refused call, because
the compiler elaborates the whole union into the message. An editor is where a
person meets that, not CI.

**What goes wrong at size is the union, built once per shape.** For plain objects it is ${perLeaf("width-300")}–${perLeaf("depth-7-distinct")} instantiations per leaf, rising with depth; a leaf under an array costs more (\`array-declared\` is ${perLeaf("array-declared")}). It is paid in
whatever file declares the adapter. A form of a few hundred leaves is tens of
thousands of instantiations and unremarkable. A generated schema with tens of
thousands of leaves is not, and this is the figure to multiply.

In the order to try them:

1. **Keep the form inside ${acceptedSegments} segments.** Free, and it is what
   the budget is for. Nesting below that is not checked, so it should not be
   built.
2. **Move \`PathDepthBudget\`.** It is one number in one file. Lowering it cuts
   the union's cost directly and truncates the deep paths; raising it does the
   reverse, and the depth rows above say what raising it buys — past the leaf
   count the budget already reaches, cost and nothing else.
3. **Make the subtree you do not address opaque.** \`OpaqueObject\` is the escape
   hatch: anything assignable to it ends a path, so a member whose interface
   extends one of its arms leaves the union along with everything under it,
   while keeping its own members and its own type. §5 is the measurement —
   ${grouped(buildCost("depth-6-distinct"))} instantiations down to
   ${grouped(buildCost("opaque-2-of-3"))} for two of three subtrees, which is
   what the paths given up were costing.
4. **Register an adapter typed \`string\`.** \`AddressablePath<string>\` is
   \`string\`, so the union collapses entirely and the form goes back to
   unchecked paths — one line of the application's own registration, which is
   already what a schema built at run time does.

**And one case that is quiet.** A \`Record<string, T>\` member is cheap — the \`record-member\` row is ${grouped(buildCost("record-member"))} instantiations — because \`Extract<keyof Record<string, Entry>, string>\` is
\`string\`, so the union grows a TEMPLATE member rather than literal ones. The
price is not instantiations. \`record-member\`'s calls address
\`byId.a1b2c3.amount\`, a key this sweep invented and nothing declares, and the
compiler accepted it. The checking a reader believes they have under that member
is not there, and nothing in the type says so.

## §8 — What was run on

| what | value |
|---|---|
| typescript | ${typescript} |
| compiler options | \`test/types-source/tsconfig.json\`'s, plus \`types: []\` and \`baseUrl\` so the floor is \`lib.d.ts\` alone |
| node | ${machine.node} |
| @types/react | ${readInstalledVersion("@types/react")} |
| machine | ${machine.cpu}, ${machine.cores} cores, ${machine.memoryGb} GB, ${machine.platform} ${machine.release} |
| programs compiled | ${result.programCount} |
| run took | ${result.minutes} minutes |

**Machine-dependent in the time and memory columns, compiler-dependent in every
column.** Check time and Memory used move with the machine; instantiations and
types move with \`typescript\`. That is the reason this lane is printed and not
gated, and the reason to re-run \`npm run bench:types\` rather than quote this
file against a different toolchain.
`;

writeFileSync(REPORT, report);
console.log(`\n${result.programCount} programs in ${result.minutes} minutes.`);
console.log("Wrote docs/measurements-types.md");
