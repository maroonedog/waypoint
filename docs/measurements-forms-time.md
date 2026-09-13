# Form runtime comparison — time lane

Every figure below is a microsecond taken from Chrome's own trace, and **none of it is gated**. Timings move when the runner does; the deterministic argument lives in `measurements-forms.md`, which is the lane CI checks.

## §0 — What this harness can see

Injected into `hand-written-per-field-state` at `leaves-201`, judged against the 0 ms rung's own band by the same rule the comparisons use.

| injected | synchronous | microtask | macrotask |
|---|---|---|---|
| 0 ms | not resolved (24.5 µs, ratio 1.029) | not resolved (8 µs, ratio 1.021) | not resolved (0.5 µs, ratio 0.995) |
| 0.1 ms | not resolved (124.5 µs, ratio 1.236) | not resolved (23.5 µs, ratio 1.036) | not resolved (19.5 µs, ratio 1.043) |
| 0.25 ms | **resolved** (278.5 µs, ratio 1.616) | not resolved (12.5 µs, ratio 1.043) | not resolved (30.5 µs, ratio 1.087) |
| 0.5 ms | **resolved** (532.5 µs, ratio 2.243) | not resolved (24 µs, ratio 1.033) | not resolved (31 µs, ratio 1.055) |
| 1 ms | **resolved** (1052 µs, ratio 3.487) | not resolved (23 µs, ratio 1.028) | not resolved (14.5 µs, ratio 1.047) |
| 2 ms | **resolved** (2069 µs, ratio 5.873) | not resolved (12 µs, ratio 1.056) | not resolved (27.5 µs, ratio 1.053) |
| 4 ms | **resolved** (4042 µs, ratio 10.521) | not resolved (3 µs, ratio 1.038) | not resolved (19 µs, ratio 1.059) |

**This harness sees 0.25 ms at the synchronous position, nothing at all up to 4 ms at the microtask position, nothing at all up to 4 ms at the macrotask position.**

The headline metric is `EventDispatch` filtered to `input`, and that event closes before a microtask runs. A runtime that defers its work — form-contract coalesces its validation pass to a microtask — is therefore cheap on this metric BY CONSTRUCTION, and the microtask and macrotask columns above are the measurement that says so rather than an argument that it might be true.

### Null bands — each subject against a byte-identical twin

Two byte-identical pages measured as sequential halves once reported **0.8891** — an 11% difference between a page and its own copy. Interleaved, the same pages read 0.9956 / 0.9897 / 1.0040. Every band below is taken interleaved, at the same size and pair count as the comparison it is used to judge.

| shape | subject | p10 | median | p90 | pairs | dropped | spread |
|---|---|---|---|---|---|---|---|
| leaves-31 | `hand-written-per-field-state` | 0.892 | 1.015 | 1.121 | 21 | 0 | 35.1% |
| leaves-31 | `form-contract-use-field` | 0.911 | 0.99 | 1.161 | 21 | 0 | 38.8% |
| leaves-31 | `form-contract-uncontrolled` | 0.861 | 0.988 | 1.173 | 21 | 0 | 44.4% |
| leaves-31 | `react-hook-form-scoped` | 0.909 | 1.016 | 1.105 | 21 | 0 | 29.4% |
| leaves-31 | `react-hook-form-deps` | 0.898 | 1.015 | 1.109 | 21 | 0 | 30.3% |
| leaves-31 | `react-hook-form-on-submit` | 0.819 | 0.991 | 1.155 | 21 | 0 | 40.3% |
| leaves-31 | `formik-use-field` | 0.926 | 0.99 | 1.055 | 21 | 0 | 20.7% |
| leaves-31 | `formik-fast-field` | 0.945 | 1.011 | 1.075 | 21 | 0 | 20.8% |
| leaves-31 | `tanstack-form-level` | 0.931 | 1.028 | 1.159 | 21 | 0 | 37.9% |
| leaves-61 | `hand-written-per-field-state` | 0.911 | 0.992 | 1.094 | 21 | 0 | 39% |
| leaves-61 | `form-contract-use-field` | 0.904 | 1.015 | 1.101 | 21 | 0 | 31% |
| leaves-61 | `form-contract-uncontrolled` | 0.843 | 0.983 | 1.13 | 21 | 0 | 44.2% |
| leaves-61 | `react-hook-form-scoped` | 0.829 | 0.955 | 1.101 | 21 | 0 | 48.3% |
| leaves-61 | `react-hook-form-deps` | 0.88 | 0.983 | 1.114 | 21 | 0 | 32.9% |
| leaves-61 | `react-hook-form-on-submit` | 0.841 | 1.005 | 1.185 | 21 | 0 | 48.2% |
| leaves-61 | `formik-use-field` | 0.922 | 0.998 | 1.077 | 21 | 0 | 20.8% |
| leaves-61 | `formik-fast-field` | 0.937 | 1.025 | 1.108 | 21 | 0 | 25.8% |
| leaves-61 | `tanstack-form-level` | 0.948 | 1.038 | 1.11 | 21 | 0 | 26.1% |
| leaves-201 | `hand-written-per-field-state` | 0.912 | 1.021 | 1.151 | 21 | 0 | 46.5% |
| leaves-201 | `form-contract-use-field` | 0.896 | 1.019 | 1.117 | 21 | 0 | 37.9% |
| leaves-201 | `form-contract-uncontrolled` | 0.919 | 0.993 | 1.124 | 21 | 0 | 39.9% |
| leaves-201 | `react-hook-form-scoped` | 0.924 | 1.032 | 1.133 | 21 | 0 | 29.2% |
| leaves-201 | `react-hook-form-deps` | 0.859 | 0.956 | 1.12 | 21 | 0 | 48.1% |
| leaves-201 | `react-hook-form-on-submit` | 0.907 | 1.017 | 1.144 | 21 | 0 | 29.6% |
| leaves-201 | `formik-use-field` | 0.944 | 1.009 | 1.043 | 21 | 0 | 16.1% |
| leaves-201 | `formik-fast-field` | 0.923 | 0.995 | 1.028 | 21 | 0 | 19.3% |
| leaves-201 | `tanstack-form-level` | 0.96 | 0.99 | 1.086 | 21 | 0 | 25.4% |

## §1 — The comparisons

### leaves-31 — 31 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 2.664 (2.5–3.064) | 544 µs | 204.5 µs | 28.8 µs | 100% | 515.3 µs | 2.302–3.196 | 21 / 0 | 33.6% | **slower** |
| `formik-use-field` | on-change | 2.65 (2.392–3.211) | 505 µs | 190 µs | 25.8 µs | 100% | 479.2 µs | 2.135–3.251 | 21 / 0 | 42.1% | **slower** |
| `formik-fast-field` | on-change | 1.946 (1.766–2.126) | 387 µs | 196 µs | 28.8 µs | 100% | 358.3 µs | 1.588–2.236 | 21 / 0 | 33.3% | **indistinguishable** |
| `form-contract-use-field` | on-change | 1.006 (0.904–1.158) | 185.5 µs | 181 µs | 25.4 µs | 0% | n/a — the pass is outside the dispatch | 0.819–1.232 | 21 / 0 | 41.1% | **indistinguishable** |
| `react-hook-form-scoped` | on-change | 0.922 (0.806–1.024) | 186 µs | 206.5 µs | 39.6 µs | 100% | 146.4 µs | 0.786–1.075 | 21 / 0 | 31.4% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.907 (0.81–0.989) | 186.5 µs | 202.5 µs | 39.2 µs | 100% | 147.3 µs | 0.806–1.077 | 21 / 0 | 29.9% | **indistinguishable** |
| `form-contract-uncontrolled` | on-change | 0.529 (0.476–0.596) | 105.5 µs | 197 µs | 28.3 µs | 0% | n/a — the pass is outside the dispatch | 0.458–0.643 | 21 / 0 | 34.9% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.516 (0.457–0.603) | 104 µs | 207 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.44–0.616 | 21 / 0 | 34% | **indistinguishable** |

- `formik-fast-field`: 191 µs is under the smallest cost this harness resolved (250 µs)
- `form-contract-use-field`: the band 0.904–1.158 overlaps the null band 0.892–1.161
- `react-hook-form-scoped`: the band 0.806–1.024 overlaps the null band 0.892–1.121
- `react-hook-form-deps`: the band 0.81–0.989 overlaps the null band 0.892–1.121
- `form-contract-uncontrolled`: only 0% of its 28.3 µs of validator work per keystroke ran inside the dispatch this metric measures, and the ladder resolves nothing at all at the microtask position; a smaller handler figure here is partly about where the work was scheduled
- `react-hook-form-on-submit`: 103 µs is under the smallest cost this harness resolved (250 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 25.4 µs of them, with 0% inside the dispatch; `form-contract-uncontrolled` ran 1 pass(es) per keystroke, 28.3 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-61 — 61 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 3.784 (3.411–4.15) | 848 µs | 230.5 µs | 35.8 µs | 100% | 812.2 µs | 2.975–4.196 | 21 / 0 | 32.3% | **slower** |
| `formik-use-field` | on-change | 3.145 (2.841–3.412) | 770 µs | 248 µs | 55 µs | 100% | 715 µs | 2.755–3.893 | 21 / 0 | 36.2% | **slower** |
| `formik-fast-field` | on-change | 2.11 (1.891–2.417) | 505 µs | 234 µs | 49.6 µs | 100% | 455.4 µs | 1.537–2.451 | 21 / 0 | 43.4% | **slower** |
| `react-hook-form-scoped` | on-change | 0.992 (0.896–1.095) | 239.5 µs | 241.5 µs | 67.5 µs | 100% | 172 µs | 0.87–1.151 | 21 / 0 | 28.3% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.958 (0.841–1.107) | 228.5 µs | 229 µs | 65 µs | 100% | 163.5 µs | 0.79–1.203 | 21 / 0 | 43.2% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.893 (0.771–0.962) | 208.5 µs | 244 µs | 40 µs | 0% | n/a — the pass is outside the dispatch | 0.748–1.071 | 21 / 0 | 36.2% | **indistinguishable** |
| `form-contract-uncontrolled` | on-change | 0.488 (0.404–0.57) | 113.5 µs | 233.5 µs | 46.7 µs | 0% | n/a — the pass is outside the dispatch | 0.367–0.579 | 21 / 0 | 43.5% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.488 (0.407–0.531) | 109.5 µs | 235 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.375–0.562 | 21 / 0 | 38.3% | **indistinguishable** |

- `react-hook-form-scoped`: the band 0.896–1.095 overlaps the null band 0.829–1.101
- `react-hook-form-deps`: the band 0.841–1.107 overlaps the null band 0.88–1.114
- `form-contract-use-field`: the band 0.771–0.962 overlaps the null band 0.904–1.101
- `form-contract-uncontrolled`: only 0% of its 46.7 µs of validator work per keystroke ran inside the dispatch this metric measures, and the ladder resolves nothing at all at the microtask position; a smaller handler figure here is partly about where the work was scheduled
- `react-hook-form-on-submit`: 125.5 µs is under the smallest cost this harness resolved (250 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 40 µs of them, with 0% inside the dispatch; `form-contract-uncontrolled` ran 1 pass(es) per keystroke, 46.7 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-201 — 201 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 5.295 (4.5–5.676) | 2240.5 µs | 416.5 µs | 125.8 µs | 100% | 2114.7 µs | 4.321–5.99 | 21 / 0 | 31.5% | **slower** |
| `formik-use-field` | on-change | 4.546 (4.2–4.906) | 2010 µs | 434 µs | 122.1 µs | 100% | 1887.9 µs | 3.738–5.038 | 21 / 0 | 28.6% | **slower** |
| `formik-fast-field` | on-change | 2.72 (2.552–2.838) | 1185 µs | 436.5 µs | 119.6 µs | 100% | 1065.4 µs | 2.309–3.02 | 21 / 0 | 26.2% | **slower** |
| `react-hook-form-deps` | on-change | 1.01 (0.92–1.081) | 442 µs | 424.5 µs | 164.2 µs | 100% | 277.8 µs | 0.825–1.185 | 21 / 0 | 35.6% | **indistinguishable** |
| `react-hook-form-scoped` | on-change | 0.994 (0.9–1.208) | 451 µs | 446.5 µs | 169.2 µs | 100% | 281.8 µs | 0.836–1.365 | 21 / 0 | 53.3% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.57 (0.477–0.616) | 245.5 µs | 424.5 µs | 132.9 µs | 0% | n/a — the pass is outside the dispatch | 0.467–0.67 | 21 / 0 | 35.5% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.323 (0.273–0.352) | 132.5 µs | 425 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.243–0.38 | 21 / 0 | 42.5% | **faster** |
| `form-contract-uncontrolled` | on-change | 0.296 (0.277–0.351) | 130.5 µs | 447 µs | 130.4 µs | 0% | n/a — the pass is outside the dispatch | 0.248–0.363 | 21 / 0 | 39% | **indistinguishable** |

- `react-hook-form-deps`: the band 0.92–1.081 overlaps the null band 0.859–1.151
- `react-hook-form-scoped`: the band 0.9–1.208 overlaps the null band 0.912–1.151
- `form-contract-use-field`: only 0% of its 132.9 µs of validator work per keystroke ran inside the dispatch this metric measures, and the ladder resolves nothing at all at the microtask position; a smaller handler figure here is partly about where the work was scheduled
- `form-contract-uncontrolled`: only 0% of its 130.4 µs of validator work per keystroke ran inside the dispatch this metric measures, and the ladder resolves nothing at all at the microtask position; a smaller handler figure here is partly about where the work was scheduled

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 132.9 µs of them, with 0% inside the dispatch; `form-contract-uncontrolled` ran 1 pass(es) per keystroke, 130.4 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

## §2 — Frame work

Style, layout and paint are the part of a keystroke that jsdom cannot see at all, which is the whole reason this lane exists beside the counts lane. Every figure is per keystroke, over the same window the row's ratio came from. Compare the Layout column against the input handler column in §1 before concluding anything from either: on this page layout alone is routinely larger than the whole script it follows, and a benchmark that publishes only the script reports a minority of the main-thread work and none of the part a person can see.

| shape | subject | UpdateLayoutTree | RecalcStyleCount | Layout | LayoutCount | Paint+PrePaint+Commit | GC |
|---|---|---|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 14.3 µs | 1 | 166 µs | 1 | 364.8 µs | 0 µs |
| leaves-31 | `form-contract-uncontrolled` | 14.7 µs | 1 | 168.3 µs | 1 | 369 µs | 0 µs |
| leaves-31 | `react-hook-form-scoped` | 14.1 µs | 1 | 165.5 µs | 1 | 371 µs | 0 µs |
| leaves-31 | `react-hook-form-deps` | 14.7 µs | 1 | 168.5 µs | 1 | 381.8 µs | 0 µs |
| leaves-31 | `react-hook-form-on-submit` | 14.9 µs | 1 | 167.8 µs | 1 | 374.4 µs | 0 µs |
| leaves-31 | `formik-use-field` | 13.9 µs | 1 | 162.3 µs | 1 | 368.1 µs | 243.4 µs |
| leaves-31 | `formik-fast-field` | 14.7 µs | 1 | 172.5 µs | 1 | 372.6 µs | 289.8 µs |
| leaves-31 | `tanstack-form-level` | 14.7 µs | 1 | 171.7 µs | 1 | 377 µs | 0 µs |
| leaves-61 | `form-contract-use-field` | 14.7 µs | 1 | 243.8 µs | 1 | 617.3 µs | 0 µs |
| leaves-61 | `form-contract-uncontrolled` | 14.5 µs | 1 | 249.3 µs | 1 | 621.4 µs | 0 µs |
| leaves-61 | `react-hook-form-scoped` | 14.8 µs | 1 | 243.4 µs | 1 | 614.9 µs | 0 µs |
| leaves-61 | `react-hook-form-deps` | 14.6 µs | 1 | 243 µs | 1 | 603.8 µs | 0 µs |
| leaves-61 | `react-hook-form-on-submit` | 14.4 µs | 1 | 240.6 µs | 1 | 614.7 µs | 0 µs |
| leaves-61 | `formik-use-field` | 15.3 µs | 1 | 243.3 µs | 1 | 604.9 µs | 493.2 µs |
| leaves-61 | `formik-fast-field` | 15.3 µs | 1 | 243.3 µs | 1 | 613.3 µs | 0 µs |
| leaves-61 | `tanstack-form-level` | 14 µs | 1 | 244.7 µs | 1 | 611.2 µs | 0 µs |
| leaves-201 | `form-contract-use-field` | 14.1 µs | 1 | 647.7 µs | 1 | 1751 µs | 0 µs |
| leaves-201 | `form-contract-uncontrolled` | 13.1 µs | 1 | 646.3 µs | 1 | 1782.6 µs | 0 µs |
| leaves-201 | `react-hook-form-scoped` | 14.6 µs | 1 | 650.3 µs | 1 | 1763.4 µs | 0 µs |
| leaves-201 | `react-hook-form-deps` | 13.9 µs | 1 | 648.7 µs | 1 | 1785.9 µs | 0 µs |
| leaves-201 | `react-hook-form-on-submit` | 13.7 µs | 1 | 639.7 µs | 1 | 1764.1 µs | 0 µs |
| leaves-201 | `formik-use-field` | 15 µs | 1 | 639.2 µs | 1 | 1767.2 µs | 406 µs |
| leaves-201 | `formik-fast-field` | 15 µs | 1 | 663.8 µs | 1 | 1761.7 µs | 0 µs |
| leaves-201 | `tanstack-form-level` | 13.8 µs | 1 | 642.1 µs | 1 | 1739.1 µs | 0 µs |

### EventDispatch by type — the evidence for the filter

`inputHandlerMicroseconds` is EventDispatch filtered to `args.data.type === "input"`. On a 200-input page the per-type medians run keypress 650 µs, textInput 617, input 77, keydown 24, keyup 12, beforeinput 2 — a median over ALL of them once made a 200,000-iteration injected busy loop completely invisible. This driver dispatches the `input` event itself rather than synthesising a key sequence, so `input` is the only type in the window; the table is printed so that is a fact a reader can see rather than a claim.

| shape | subject | input dispatches | input | selectionchange |
|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 12 | 185.5 µs | — |
| leaves-31 | `form-contract-uncontrolled` | 12 | 105.5 µs | — |
| leaves-31 | `react-hook-form-scoped` | 12 | 186 µs | — |
| leaves-31 | `react-hook-form-deps` | 12 | 186.5 µs | — |
| leaves-31 | `react-hook-form-on-submit` | 12 | 104 µs | — |
| leaves-31 | `formik-use-field` | 12 | 505 µs | — |
| leaves-31 | `formik-fast-field` | 12 | 387 µs | 29 µs |
| leaves-31 | `tanstack-form-level` | 12 | 544 µs | — |
| leaves-61 | `form-contract-use-field` | 12 | 208.5 µs | — |
| leaves-61 | `form-contract-uncontrolled` | 12 | 113.5 µs | — |
| leaves-61 | `react-hook-form-scoped` | 12 | 239.5 µs | — |
| leaves-61 | `react-hook-form-deps` | 12 | 228.5 µs | — |
| leaves-61 | `react-hook-form-on-submit` | 12 | 109.5 µs | — |
| leaves-61 | `formik-use-field` | 12 | 770 µs | — |
| leaves-61 | `formik-fast-field` | 12 | 505 µs | — |
| leaves-61 | `tanstack-form-level` | 12 | 848 µs | — |
| leaves-201 | `form-contract-use-field` | 12 | 245.5 µs | — |
| leaves-201 | `form-contract-uncontrolled` | 12 | 130.5 µs | — |
| leaves-201 | `react-hook-form-scoped` | 12 | 451 µs | — |
| leaves-201 | `react-hook-form-deps` | 12 | 442 µs | — |
| leaves-201 | `react-hook-form-on-submit` | 12 | 132.5 µs | — |
| leaves-201 | `formik-use-field` | 12 | 2010 µs | — |
| leaves-201 | `formik-fast-field` | 12 | 1185 µs | — |
| leaves-201 | `tanstack-form-level` | 12 | 2240.5 µs | — |

## §3 — What was run on

| what | value |
|---|---|
| product | Chrome/152.0.7977.82 |
| revision | @d04cdb24d67b081f6cf80200ffc5233f44b61109 |
| V8 | 15.2.124.21 |
| CDP protocol | 1.3 |
| user agent | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36 |
| headless | true |
| flags | `--disable-background-timer-throttling` `--disable-backgrounding-occluded-windows` `--disable-renderer-backgrounding` `--disable-ipc-flooding-protection` `--force-device-scale-factor=1` `--hide-scrollbars` `--disable-features=CalculateNativeWinOcclusion` |
| devicePixelRatio | 1 |
| observed refresh | 60 Hz |
| CPU throttle | 1x |
| crossOriginIsolated | true |
| performance.now() tick | 5 µs |
| hardwareConcurrency | 2 |

Machine: INTEL(R) XEON(R) PLATINUM 8573C, 2 cores, 7.8 GB, linux 6.17.0-1022-azure, node v23.11.1. react 19.3.0, react-dom 19.3.0, zod 4.6.4, react-hook-form 7.87.0, formik 2.4.9, @tanstack/react-form 1.33.5. Bundle 475 kB across both origins (http://127.0.0.1:5191 and http://127.0.0.1:5192). Run took 11.9 minutes.

How a sample was taken: 21 interleaved pairs per comparison, 12 keystrokes per sample, each keystroke followed by a presented frame and a macrotask; both members of a pair inside ONE tracing session, on two origins so that they are two renderer processes; order alternating every pair and origin alternating at the half-way point. Trace categories: `devtools.timeline`, `blink.user_timing`, `v8`, `disabled-by-default-v8.gc`.

Warm order, in full:

1. the oracle warms every shape's schema on both lanes, before any mount
1. form-contract-use-field warms 250 ms
1. form-contract-uncontrolled warms 250 ms
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
