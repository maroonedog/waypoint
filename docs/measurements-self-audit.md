# Form runtime self-audit — Tier 2

form-contract only. **No competitor column**, because no competitor exposes an equivalent — this tier gates the author's library against the author's own design document, and it is a self-audit rather than a comparison.

Every integer in §1–§3 is gated by `npm run bench:self-audit:check`. The microseconds in §4 are not gated and are recorded nowhere: they move when the runner does, which is the same reason the counts lane gates and the time lane does not.

Driven through `@maroonedog/form-contract/core` with **no React**. The subscription installed per field is `sources.value.subscribe`, which is the one `useCell` hands to `useSyncExternalStore`, so "every field on screen" here opens exactly the cells a rendered form opens. The sizes are the counts lane's `leaves-31`, `leaves-61` and `leaves-201`, plus a `leaves-401` this lane can afford because it mounts no competitors.

## What was measured on

`win32 10.0.26200`, x64, AMD Ryzen 7 5825U with Radeon Graphics, 16 cores, 15.3 GB, Node v23.11.0.

## §1 — What a mount seeds

`create-form.ts` calls `seed-form-cells.ts` before any component exists, so `cellsSeededAtMount` is O(N) and never 0. It is **not** the number the README's "mounting is a subscription and nothing else" refers to: that one is about the React mount commit, which is trivially 0 by construction because no component has rendered yet. Both are true, and they are not the same claim.

| shape | leaves | cells seeded at mount | of those, value cells | store reads |
|---|---|---|---|---|
| leaves-31 | 31 | 39 | 32 | 0 |
| leaves-61 | 61 | 69 | 62 | 0 |
| leaves-201 | 201 | 209 | 202 | 0 |
| leaves-401 | 401 | 409 | 402 | 0 |

The 8 cells above the leaf count are the root, the `items` array cell and its row order, and the form-state cells.

## §2 — What one write scans, and what it finds

`refresh-open-cells.ts` runs on every write. Its second loop asks `open-value-cells.ts` for every open value cell — an `Array.from` over the reader-count map — and runs one `isAncestorPath` per entry. **`cells scanned` is what the write looked at; `cells refreshed` is what it found.**

| shape | scenario | wrote | open cells | cells scanned | ancestor probes | cells refreshed | store writes | store reads | notifications |
|---|---|---|---|---|---|---|---|---|---|
| leaves-31 | one-field-on-screen | `applicant.lastName` | 1 | 1 | 1 | 0 | 3 | 1 | 1 |
| leaves-31 | every-field-on-screen | `applicant.lastName` | 31 | 31 | 1 | 0 | 3 | 1 | 1 |
| leaves-31 | every-field-and-its-group | `applicant.lastName` | 32 | 32 | 1 | 1 | 4 | 1 | 2 |
| leaves-31 | write-at-a-container | `items` | 31 | 31 | 0 | 12 | 15 | 1 | 1 |
| leaves-61 | one-field-on-screen | `applicant.lastName` | 1 | 1 | 1 | 0 | 3 | 1 | 1 |
| leaves-61 | every-field-on-screen | `applicant.lastName` | 61 | 61 | 1 | 0 | 3 | 1 | 1 |
| leaves-61 | every-field-and-its-group | `applicant.lastName` | 62 | 62 | 1 | 1 | 4 | 1 | 2 |
| leaves-61 | write-at-a-container | `items` | 61 | 61 | 0 | 12 | 15 | 1 | 1 |
| leaves-201 | one-field-on-screen | `applicant.lastName` | 1 | 1 | 1 | 0 | 3 | 1 | 1 |
| leaves-201 | every-field-on-screen | `applicant.lastName` | 201 | 201 | 1 | 0 | 3 | 1 | 1 |
| leaves-201 | every-field-and-its-group | `applicant.lastName` | 202 | 202 | 1 | 1 | 4 | 1 | 2 |
| leaves-201 | write-at-a-container | `items` | 201 | 201 | 0 | 12 | 15 | 1 | 1 |
| leaves-401 | one-field-on-screen | `applicant.lastName` | 1 | 1 | 1 | 0 | 3 | 1 | 1 |
| leaves-401 | every-field-on-screen | `applicant.lastName` | 401 | 401 | 1 | 0 | 3 | 1 | 1 |
| leaves-401 | every-field-and-its-group | `applicant.lastName` | 402 | 402 | 1 | 1 | 4 | 1 | 2 |
| leaves-401 | write-at-a-container | `items` | 401 | 401 | 0 | 12 | 15 | 1 | 1 |

`store writes` is the root, the value cell, the dirty cell, and one per refreshed cell — design §3's "work is O(cells that changed), not O(mounted fields)", which holds and is asserted rather than asserted at. `cells scanned` is the part that is O(mounted fields) anyway, and the two sit in one row so that neither can be quoted without the other.

## §3 — What one validation pass distributes

One leaf broken, one whole-root pass, `validateOn: "submit"` so the measured pass is the only pass.

| shape | leaves | issues produced | issue cells written | notifications |
|---|---|---|---|---|
| leaves-31 | 31 | 1 | 1 | 0 |
| leaves-61 | 61 | 1 | 1 | 0 |
| leaves-201 | 201 | 1 | 1 | 0 |
| leaves-401 | 401 | 1 | 1 | 0 |

## §4 — What the scan costs (printed, never gated)

`refreshOpenAround` called directly, with the real `createOpenValueCells` map behind it, so the array it allocates per write is the one the library allocates. Median of 15 interleaved samples of 2,000 scans; `spread` is peak-to-peak over those samples as a share of the median, and it is printed because it is the only honest way to say how much to trust the column beside it. The spreads below are wide — this is a laptop with other work on it. What makes the result readable anyway is that the per-cell slope agrees to within 20% across four sizes measured independently, which noise does not do.

The fixture holds no listeners, so what is timed is the scan and the reads it makes, never the renders a refresh would go on to cause.

| shape | wrote | cells scanned | cells refreshed | µs per scan (median) | spread |
|---|---|---|---|---|---|
| leaves-31 | `applicant.lastName` | 1 | 0 | 0.313 | 80.9% |
| leaves-31 | `applicant.lastName` | 8 | 0 | 0.506 | 156.1% |
| leaves-31 | `applicant.lastName` | 16 | 0 | 0.571 | 112.0% |
| leaves-31 | `applicant.lastName` | 31 | 0 | 0.689 | 110.7% |
| leaves-31 | `items` | 1 | 0 | 0.094 | 160.5% |
| leaves-31 | `items` | 8 | 0 | 0.192 | 153.5% |
| leaves-31 | `items` | 16 | 0 | 0.317 | 66.0% |
| leaves-31 | `items` | 31 | 12 | 18.128 | 63.4% |
| leaves-61 | `applicant.lastName` | 1 | 0 | 0.174 | 119.6% |
| leaves-61 | `applicant.lastName` | 16 | 0 | 0.312 | 116.6% |
| leaves-61 | `applicant.lastName` | 31 | 0 | 0.475 | 103.5% |
| leaves-61 | `applicant.lastName` | 61 | 0 | 0.775 | 101.1% |
| leaves-61 | `items` | 1 | 0 | 0.057 | 266.3% |
| leaves-61 | `items` | 16 | 0 | 0.182 | 131.1% |
| leaves-61 | `items` | 31 | 12 | 13.184 | 47.4% |
| leaves-61 | `items` | 61 | 12 | 14.324 | 71.4% |
| leaves-201 | `applicant.lastName` | 1 | 0 | 0.193 | 179.8% |
| leaves-201 | `applicant.lastName` | 51 | 0 | 0.578 | 138.0% |
| leaves-201 | `applicant.lastName` | 101 | 0 | 1.069 | 101.4% |
| leaves-201 | `applicant.lastName` | 201 | 0 | 2.033 | 47.2% |
| leaves-201 | `items` | 1 | 0 | 0.062 | 93.2% |
| leaves-201 | `items` | 51 | 12 | 17.055 | 170.7% |
| leaves-201 | `items` | 101 | 12 | 17.855 | 166.0% |
| leaves-201 | `items` | 201 | 12 | 21.534 | 114.7% |
| leaves-401 | `applicant.lastName` | 1 | 0 | 0.182 | 107.9% |
| leaves-401 | `applicant.lastName` | 101 | 0 | 1.116 | 80.0% |
| leaves-401 | `applicant.lastName` | 201 | 0 | 2.156 | 75.7% |
| leaves-401 | `applicant.lastName` | 401 | 0 | 3.575 | 68.2% |
| leaves-401 | `items` | 1 | 0 | 0.053 | 104.9% |
| leaves-401 | `items` | 101 | 12 | 13.529 | 72.6% |
| leaves-401 | `items` | 201 | 12 | 16.113 | 82.2% |
| leaves-401 | `items` | 401 | 12 | 18.579 | 78.1% |

Both halves of the scan are in that table. On `applicant.lastName` it finds nothing however many cells are open, and the whole cost is the looking. On `items` it finds the twelve row members, and the same two rows at the same size differ by 15.00 µs — about 1250 ns per refreshed cell, several times what it cost to scan four hundred cells to reach them. A refresh is a `readValueAt`, which walks the path through `splitConcretePath` on every call rather than from anything memoised, plus minting the key and one map probe. It is NOT a store write: this fixture's root does not change between scans, so `createCellStore`'s `Object.is` gate returns early every time after the first, and the figure excludes both the map set and the notify a real keystroke would pay. Neither is the loop the design document names.

And the two things the scan is a part of — one `setValue` through the field handle with every field on screen, and one whole-root pass through the same adapter the scheduler calls:

| shape | open cells | µs per setValue | spread | µs per validation pass | spread |
|---|---|---|---|---|---|
| leaves-31 | 31 | 5.048 | 50.6% | 19.005 | 128.1% |
| leaves-61 | 61 | 5.532 | 62.6% | 30.725 | 118.4% |
| leaves-201 | 201 | 7.086 | 74.4% | 160.660 | 68.6% |
| leaves-401 | 401 | 11.295 | 92.8% | 467.565 | 70.6% |

| shape | ns per open cell | µs scanning at full screen | µs for setValue + one pass | the scan's share |
|---|---|---|---|---|
| leaves-31 | 11.5 | 0.689 | 24.053 | 2.9% |
| leaves-61 | 10.1 | 0.775 | 36.257 | 2.1% |
| leaves-201 | 9.3 | 2.033 | 167.746 | 1.2% |
| leaves-401 | 8.5 | 3.575 | 478.860 | 0.7% |

### The verdict

At 401 fields with every one of them on screen, a write spends 3.57 µs scanning open cells, out of 478.86 µs for the write plus the whole-root validation pass that same keystroke schedules — 0.7% of it.

The design document was right about the SHAPE. The scan is O(fields on screen), it runs on every write, and on a leaf edit it refreshes nothing at all: 401 comparisons and a 401-element allocation to produce zero cell writes. That is a real property of the runtime, it was invisible to every metric the counts lane publishes, and it is now a gated integer.

It was wrong about the SIZE, and this report is the place to say so. At the size where the document said the cost would matter, the scan is a low single-digit percentage of the work one keystroke already does, and it is an order of magnitude below the validation pass beside it. Removing it — an ancestor-indexed open set, say — would be a correct optimisation of something nobody would be able to feel. A self-audit that only confirmed the author's fears would not be one.

It also looked in the wrong place. The expensive part of `refresh-open-cells.ts` is not the loop the document names but what happens per cell that loop finds: 1250 ns each, so twelve of them cost more than scanning four hundred. A design document that worried about the O(N) loop and not about the twelve-cell one was reasoning about complexity classes rather than about work, which is what measuring is for.

What the numbers do NOT say: nothing here is a millisecond in a browser. There is no layout, no style resolution and no paint in this process, and the time lane exists because those dominate. This section prices one function against two others in the same process, and that is all.

