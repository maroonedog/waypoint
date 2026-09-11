# Form runtime comparison — time lane

Every figure below is a microsecond taken from Chrome's own trace, and **none of it is gated**. Timings move when the runner does; the deterministic argument lives in `measurements-forms.md`, which is the lane CI checks.

## §0 — What this harness can see

Injected into `hand-written-per-field-state` at `leaves-201`, judged against the 0 ms rung's own band by the same rule the comparisons use.

| injected | synchronous | microtask | macrotask |
|---|---|---|---|
| 0 ms | not resolved (-47.5 µs, ratio 0.973) | not resolved (23 µs, ratio 1.01) | not resolved (-19 µs, ratio 0.971) |
| 0.1 ms | not resolved (199.5 µs, ratio 1.111) | not resolved (-97 µs, ratio 1) | not resolved (54 µs, ratio 1.081) |
| 0.25 ms | not resolved (331.5 µs, ratio 1.254) | not resolved (47 µs, ratio 1.054) | not resolved (34.5 µs, ratio 1.007) |
| 0.5 ms | **resolved** (613 µs, ratio 1.447) | not resolved (-26 µs, ratio 0.996) | not resolved (28.5 µs, ratio 1.045) |
| 1 ms | **resolved** (1157 µs, ratio 1.771) | not resolved (-40.5 µs, ratio 0.982) | not resolved (51 µs, ratio 1.034) |
| 2 ms | **resolved** (2158.5 µs, ratio 2.693) | not resolved (-25 µs, ratio 0.966) | not resolved (95 µs, ratio 1.126) |
| 4 ms | **resolved** (4098.5 µs, ratio 4.485) | not resolved (55 µs, ratio 1.066) | not resolved (-26 µs, ratio 0.965) |

**This harness sees 0.5 ms at the synchronous position, nothing at all up to 4 ms at the microtask position, nothing at all up to 4 ms at the macrotask position.**

The headline metric is `EventDispatch` filtered to `input`, and that event closes before a microtask runs. A runtime that defers its work — form-contract coalesces its validation pass to a microtask — is therefore cheap on this metric BY CONSTRUCTION, and the microtask and macrotask columns above are the measurement that says so rather than an argument that it might be true.

### Null bands — each subject against a byte-identical twin

Two byte-identical pages measured as sequential halves once reported **0.8891** — an 11% difference between a page and its own copy. Interleaved, the same pages read 0.9956 / 0.9897 / 1.0040. Every band below is taken interleaved, at the same size and pair count as the comparison it is used to judge.

| shape | subject | p10 | median | p90 | pairs | dropped | spread |
|---|---|---|---|---|---|---|---|
| leaves-31 | `hand-written-per-field-state` | 0.87 | 0.98 | 1.063 | 21 | 0 | 27.8% |
| leaves-31 | `form-contract-use-field` | 0.887 | 0.983 | 1.151 | 21 | 0 | 43.4% |
| leaves-31 | `react-hook-form-scoped` | 0.866 | 0.997 | 1.263 | 21 | 0 | 59.8% |
| leaves-31 | `react-hook-form-deps` | 0.942 | 0.982 | 1.27 | 21 | 0 | 68% |
| leaves-31 | `react-hook-form-on-submit` | 0.786 | 0.965 | 1.093 | 21 | 0 | 41% |
| leaves-31 | `formik-use-field` | 0.856 | 0.977 | 1.145 | 21 | 0 | 48.4% |
| leaves-31 | `formik-fast-field` | 0.929 | 1.03 | 1.178 | 21 | 0 | 55.7% |
| leaves-31 | `tanstack-form-level` | 0.863 | 0.945 | 1.106 | 21 | 0 | 48.7% |
| leaves-61 | `hand-written-per-field-state` | 0.875 | 0.988 | 1.065 | 21 | 0 | 66.4% |
| leaves-61 | `form-contract-use-field` | 0.852 | 0.979 | 1.27 | 21 | 0 | 69.9% |
| leaves-61 | `react-hook-form-scoped` | 0.868 | 1.038 | 1.178 | 21 | 0 | 45.3% |
| leaves-61 | `react-hook-form-deps` | 0.904 | 1.013 | 1.064 | 21 | 0 | 30.7% |
| leaves-61 | `react-hook-form-on-submit` | 0.87 | 0.968 | 1.122 | 21 | 0 | 43.2% |
| leaves-61 | `formik-use-field` | 0.774 | 1.001 | 1.192 | 21 | 0 | 72.1% |
| leaves-61 | `formik-fast-field` | 0.874 | 0.953 | 1.205 | 21 | 0 | 61.3% |
| leaves-61 | `tanstack-form-level` | 0.909 | 0.982 | 1.22 | 21 | 0 | 88.5% |
| leaves-201 | `hand-written-per-field-state` | 0.799 | 0.938 | 1.171 | 21 | 0 | 57.2% |
| leaves-201 | `form-contract-use-field` | 0.866 | 0.983 | 1.256 | 21 | 0 | 101.8% |
| leaves-201 | `react-hook-form-scoped` | 0.924 | 1.02 | 1.167 | 21 | 0 | 58.5% |
| leaves-201 | `react-hook-form-deps` | 0.939 | 1.033 | 1.197 | 21 | 0 | 45.5% |
| leaves-201 | `react-hook-form-on-submit` | 0.895 | 0.974 | 1.053 | 21 | 0 | 36.3% |
| leaves-201 | `formik-use-field` | 0.835 | 0.985 | 1.166 | 21 | 0 | 66.8% |
| leaves-201 | `formik-fast-field` | 0.918 | 0.984 | 1.157 | 21 | 0 | 68.1% |
| leaves-201 | `tanstack-form-level` | 0.871 | 1.017 | 1.227 | 21 | 0 | 58.1% |

## §1 — The comparisons

### leaves-31 — 31 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 2.484 (2.203–2.715) | 805.5 µs | 322.5 µs | 56.7 µs | 100% | 748.8 µs | 1.969–3.229 | 21 / 0 | 50.8% | **indistinguishable** |
| `formik-use-field` | on-change | 2.253 (1.771–3.099) | 760.5 µs | 345.5 µs | 57.1 µs | 100% | 703.4 µs | 1.685–3.2 | 21 / 0 | 67.2% | **indistinguishable** |
| `formik-fast-field` | on-change | 1.769 (1.425–2.234) | 759.5 µs | 402 µs | 62.9 µs | 100% | 696.6 µs | 1.279–2.508 | 21 / 0 | 69.5% | **indistinguishable** |
| `form-contract-use-field` | on-change | 1.003 (0.774–1.117) | 437 µs | 435.5 µs | 70.8 µs | 0% | n/a — the pass is outside the dispatch | 0.71–1.429 | 21 / 0 | 71.7% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.906 (0.778–1.009) | 330.5 µs | 344.5 µs | 68.8 µs | 100% | 261.8 µs | 0.758–1.097 | 21 / 0 | 37.5% | **indistinguishable** |
| `react-hook-form-scoped` | on-change | 0.899 (0.756–1.026) | 339 µs | 369.5 µs | 80.8 µs | 100% | 258.2 µs | 0.68–1.183 | 21 / 0 | 56% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.541 (0.457–0.636) | 223.5 µs | 426 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.406–0.657 | 21 / 0 | 46.5% | **indistinguishable** |

- `tanstack-form-level`: 483 µs is under the smallest cost this harness resolved (500 µs)
- `formik-use-field`: 415 µs is under the smallest cost this harness resolved (500 µs)
- `formik-fast-field`: 357.5 µs is under the smallest cost this harness resolved (500 µs)
- `form-contract-use-field`: the band 0.774–1.117 overlaps the null band 0.87–1.151
- `react-hook-form-deps`: the band 0.778–1.009 overlaps the null band 0.87–1.27
- `react-hook-form-scoped`: the band 0.756–1.026 overlaps the null band 0.866–1.263
- `react-hook-form-on-submit`: 202.5 µs is under the smallest cost this harness resolved (500 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 70.8 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-61 — 61 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 3.118 (2.762–3.848) | 1174 µs | 388 µs | 78.8 µs | 100% | 1095.3 µs | 2.724–3.983 | 21 / 0 | 40.4% | **slower** |
| `formik-use-field` | on-change | 2.69 (2.445–3.057) | 1167 µs | 426 µs | 100.4 µs | 100% | 1066.6 µs | 2.083–3.361 | 21 / 0 | 47.5% | **slower** |
| `formik-fast-field` | on-change | 1.774 (1.674–2.008) | 670 µs | 376.5 µs | 79.2 µs | 100% | 590.8 µs | 1.6–2.294 | 21 / 0 | 39.1% | **indistinguishable** |
| `react-hook-form-scoped` | on-change | 0.923 (0.797–1.097) | 553.5 µs | 616 µs | 136.3 µs | 100% | 417.3 µs | 0.748–1.192 | 21 / 0 | 48.1% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.902 (0.757–0.992) | 368.5 µs | 424 µs | 96.7 µs | 100% | 271.8 µs | 0.701–1.126 | 21 / 0 | 47.1% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.888 (0.768–1.089) | 365 µs | 422 µs | 72.5 µs | 0% | n/a — the pass is outside the dispatch | 0.673–1.263 | 21 / 0 | 66.5% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.466 (0.415–0.524) | 223.5 µs | 492 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.405–0.572 | 21 / 0 | 35.9% | **indistinguishable** |

- `formik-fast-field`: 293.5 µs is under the smallest cost this harness resolved (500 µs)
- `react-hook-form-scoped`: the band 0.797–1.097 overlaps the null band 0.868–1.178
- `react-hook-form-deps`: the band 0.757–0.992 overlaps the null band 0.875–1.065
- `form-contract-use-field`: the band 0.768–1.089 overlaps the null band 0.852–1.27
- `react-hook-form-on-submit`: 268.5 µs is under the smallest cost this harness resolved (500 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 72.5 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-201 — 201 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 4.056 (3.741–4.942) | 5920.5 µs | 1355.5 µs | 570.4 µs | 100% | 5350.1 µs | 3.541–5.091 | 21 / 0 | 38.2% | **slower** |
| `formik-use-field` | on-change | 3.874 (3.483–5.914) | 2581 µs | 650 µs | 248.3 µs | 100% | 2332.7 µs | 2.977–7.993 | 21 / 0 | 129.5% | **slower** |
| `formik-fast-field` | on-change | 2.278 (1.996–2.652) | 2063.5 µs | 1034 µs | 303.3 µs | 100% | 1760.2 µs | 1.839–2.703 | 21 / 0 | 37.9% | **slower** |
| `react-hook-form-scoped` | on-change | 0.924 (0.746–1.088) | 686.5 µs | 743 µs | 268.3 µs | 100% | 418.2 µs | 0.711–1.385 | 21 / 0 | 72.9% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.848 (0.798–0.95) | 1132 µs | 1328 µs | 463.8 µs | 100% | 668.3 µs | 0.745–0.993 | 21 / 0 | 29.3% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.629 (0.518–0.703) | 475.5 µs | 783 µs | 294.2 µs | 0% | n/a — the pass is outside the dispatch | 0.484–0.759 | 21 / 0 | 43.6% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.316 (0.26–0.429) | 323 µs | 1017.5 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.236–0.442 | 21 / 0 | 65.3% | **faster** |

- `react-hook-form-scoped`: the band 0.746–1.088 overlaps the null band 0.799–1.171
- `react-hook-form-deps`: the band 0.798–0.95 overlaps the null band 0.799–1.197
- `form-contract-use-field`: 307.5 µs is under the smallest cost this harness resolved (500 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 294.2 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

## §2 — Frame work

Style, layout and paint are the part of a keystroke that jsdom cannot see at all, which is the whole reason this lane exists beside the counts lane. Every figure is per keystroke, over the same window the row's ratio came from. Compare the Layout column against the input handler column in §1 before concluding anything from either: on this page layout alone is routinely larger than the whole script it follows, and a benchmark that publishes only the script reports a minority of the main-thread work and none of the part a person can see.

| shape | subject | UpdateLayoutTree | RecalcStyleCount | Layout | LayoutCount | Paint+PrePaint+Commit | GC |
|---|---|---|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 39.9 µs | 1 | 393.7 µs | 1 | 861.3 µs | 0 µs |
| leaves-31 | `react-hook-form-scoped` | 36.8 µs | 1 | 385.9 µs | 1 | 801.3 µs | 0 µs |
| leaves-31 | `react-hook-form-deps` | 37 µs | 1 | 396.7 µs | 1 | 910.7 µs | 0 µs |
| leaves-31 | `react-hook-form-on-submit` | 41.8 µs | 1 | 444.8 µs | 1 | 1044.3 µs | 0 µs |
| leaves-31 | `formik-use-field` | 37.1 µs | 1 | 401.1 µs | 1 | 914.1 µs | 226.7 µs |
| leaves-31 | `formik-fast-field` | 40.1 µs | 1 | 431.9 µs | 1 | 1084.1 µs | 277.6 µs |
| leaves-31 | `tanstack-form-level` | 35.3 µs | 1 | 369.4 µs | 1 | 832.8 µs | 0 µs |
| leaves-61 | `form-contract-use-field` | 37.3 µs | 1 | 569.3 µs | 1 | 1573.4 µs | 0 µs |
| leaves-61 | `react-hook-form-scoped` | 53.8 µs | 1 | 978.4 µs | 1 | 2195.2 µs | 0 µs |
| leaves-61 | `react-hook-form-deps` | 42 µs | 1 | 602.2 µs | 1 | 1446.9 µs | 0 µs |
| leaves-61 | `react-hook-form-on-submit` | 42.6 µs | 1 | 673 µs | 1 | 1573.5 µs | 0 µs |
| leaves-61 | `formik-use-field` | 40.7 µs | 1 | 591.6 µs | 1 | 1391.4 µs | 291.6 µs |
| leaves-61 | `formik-fast-field` | 37.7 µs | 1 | 534.4 µs | 1 | 1195.2 µs | 0 µs |
| leaves-61 | `tanstack-form-level` | 40.1 µs | 1 | 621.2 µs | 1 | 1342.6 µs | 0 µs |
| leaves-201 | `form-contract-use-field` | 44.8 µs | 1 | 1654.7 µs | 1 | 4535.3 µs | 0 µs |
| leaves-201 | `react-hook-form-scoped` | 42.2 µs | 1 | 1411.3 µs | 1 | 3962.5 µs | 0 µs |
| leaves-201 | `react-hook-form-deps` | 66.3 µs | 1 | 2743.4 µs | 1 | 8529.8 µs | 0 µs |
| leaves-201 | `react-hook-form-on-submit` | 47.9 µs | 1 | 1834.1 µs | 1 | 6435.3 µs | 0 µs |
| leaves-201 | `formik-use-field` | 38.3 µs | 1 | 1309.4 µs | 1 | 4420.2 µs | 525.8 µs |
| leaves-201 | `formik-fast-field` | 41.7 µs | 1 | 1666.1 µs | 1 | 5449.7 µs | 0 µs |
| leaves-201 | `tanstack-form-level` | 58.2 µs | 1 | 2316.2 µs | 1 | 8745.3 µs | 0 µs |

### EventDispatch by type — the evidence for the filter

`inputHandlerMicroseconds` is EventDispatch filtered to `args.data.type === "input"`. On a 200-input page the per-type medians run keypress 650 µs, textInput 617, input 77, keydown 24, keyup 12, beforeinput 2 — a median over ALL of them once made a 200,000-iteration injected busy loop completely invisible. This driver dispatches the `input` event itself rather than synthesising a key sequence, so `input` is the only type in the window; the table is printed so that is a fact a reader can see rather than a claim.

| shape | subject | input dispatches | input | selectionchange |
|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 12 | 437 µs | — |
| leaves-31 | `react-hook-form-scoped` | 12 | 339 µs | — |
| leaves-31 | `react-hook-form-deps` | 12 | 330.5 µs | — |
| leaves-31 | `react-hook-form-on-submit` | 12 | 223.5 µs | — |
| leaves-31 | `formik-use-field` | 12 | 760.5 µs | — |
| leaves-31 | `formik-fast-field` | 12 | 759.5 µs | — |
| leaves-31 | `tanstack-form-level` | 12 | 805.5 µs | 82 µs |
| leaves-61 | `form-contract-use-field` | 12 | 365 µs | — |
| leaves-61 | `react-hook-form-scoped` | 12 | 553.5 µs | — |
| leaves-61 | `react-hook-form-deps` | 12 | 368.5 µs | — |
| leaves-61 | `react-hook-form-on-submit` | 12 | 223.5 µs | — |
| leaves-61 | `formik-use-field` | 12 | 1167 µs | — |
| leaves-61 | `formik-fast-field` | 12 | 670 µs | — |
| leaves-61 | `tanstack-form-level` | 12 | 1174 µs | — |
| leaves-201 | `form-contract-use-field` | 12 | 475.5 µs | — |
| leaves-201 | `react-hook-form-scoped` | 12 | 686.5 µs | — |
| leaves-201 | `react-hook-form-deps` | 12 | 1132 µs | — |
| leaves-201 | `react-hook-form-on-submit` | 12 | 323 µs | — |
| leaves-201 | `formik-use-field` | 12 | 2581 µs | — |
| leaves-201 | `formik-fast-field` | 12 | 2063.5 µs | — |
| leaves-201 | `tanstack-form-level` | 12 | 5920.5 µs | — |

## §3 — What was run on

| what | value |
|---|---|
| product | Chrome/152.0.7977.84 |
| revision | @4334922f44c77b1208072c4deac29db3af39bbea |
| V8 | 15.2.124.21 |
| CDP protocol | 1.3 |
| user agent | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36 |
| headless | true |
| flags | `--disable-background-timer-throttling` `--disable-backgrounding-occluded-windows` `--disable-renderer-backgrounding` `--disable-ipc-flooding-protection` `--force-device-scale-factor=1` `--hide-scrollbars` `--disable-features=CalculateNativeWinOcclusion` |
| devicePixelRatio | 1 |
| observed refresh | 60 Hz |
| CPU throttle | 1x |
| crossOriginIsolated | true |
| performance.now() tick | 5 µs |
| hardwareConcurrency | 16 |

Machine: AMD Ryzen 7 5825U with Radeon Graphics, 16 cores, 15.3 GB, win32 10.0.26200, node v23.11.0. react 19.3.0, react-dom 19.3.0, zod 4.6.1, react-hook-form 7.87.0, formik 2.4.9, @tanstack/react-form 1.33.5. Bundle 473 kB across both origins (http://127.0.0.1:5191 and http://127.0.0.1:5192). Run took 13.4 minutes.

How a sample was taken: 21 interleaved pairs per comparison, 12 keystrokes per sample, each keystroke followed by a presented frame and a macrotask; both members of a pair inside ONE tracing session, on two origins so that they are two renderer processes; order alternating every pair and origin alternating at the half-way point. Trace categories: `devtools.timeline`, `blink.user_timing`, `v8`, `disabled-by-default-v8.gc`.

Warm order, in full:

1. the oracle warms every shape's schema on both lanes, before any mount
1. form-contract-use-field warms 250 ms
1. hand-written-per-field-state warms 250 ms
1. react-hook-form-scoped warms 250 ms
1. react-hook-form-deps warms 250 ms
1. react-hook-form-on-submit warms 250 ms
1. formik-use-field warms 250 ms
1. formik-fast-field warms 250 ms
1. tanstack-form-level warms 250 ms

## §4 — Excluded metrics

| metric | taken from | why it is not published |
|---|---|---|
| `ScriptDuration` | Performance.getMetrics | 245% pair-ratio spread between two BYTE-IDENTICAL pages. A metric that cannot tell a page from its own copy cannot tell two libraries apart. |
| `TaskDuration` | Performance.getMetrics | 2.94 ms per keystroke against 26 µs of actual script: it is dominated by the driver's own CDP round trip, so it measures the harness. |
| `PerformanceEventTiming.duration` | PerformanceObserver, entryType 'event' | Quantised to 8 ms by specification. Every figure this lane publishes is smaller than one quantum of it. |
| `Profiler.actualDuration` | React's <Profiler onRender> | About 6x smaller than wall clock because it excludes commit, and it fires ZERO times in the production react-dom build this lane requires. |
| `every millisecond taken in jsdom` | the counts lane | jsdom has no layout, no style resolution, no paint and no compositor. Measured on a 200-input page: 216-272 µs of layout against 26 µs of script per keystroke. Publishing the 26 as 'the cost of typing' reports 9% of the main-thread work and none of the part a person can see. |
| `EventLatency` | the trace, categories cc,benchmark | Chrome emits it only for input the compositor actually delivered. This driver types the way the counts lane types — the value through the prototype setter, then one bubbling `input` event — so a run produces ZERO EventLatency events. Measured: 0 across a whole trace. A column of zeros reads as a result; an absent column reads as what it is. |
| `PerformanceObserver entryTypes: ['gc']` | the browser design's own prescription | No such entry type exists in Chrome — it is a Node perf_hooks API. GC is taken from the trace instead (V8.GC*, MajorGC, MinorGC) and published as a column; samples are never dropped for it. |
