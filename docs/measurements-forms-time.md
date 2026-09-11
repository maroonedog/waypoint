# Form runtime comparison — time lane

Every figure below is a microsecond taken from Chrome's own trace, and **none of it is gated**. Timings move when the runner does; the deterministic argument lives in `measurements-forms.md`, which is the lane CI checks.

## §0 — What this harness can see

Injected into `hand-written-per-field-state` at `leaves-201`, judged against the 0 ms rung's own band by the same rule the comparisons use.

| injected | synchronous | microtask | macrotask |
|---|---|---|---|
| 0 ms | not resolved (24 µs, ratio 1.004) | not resolved (0 µs, ratio 0.998) | not resolved (2 µs, ratio 1.002) |
| 0.1 ms | not resolved (122.5 µs, ratio 1.187) | not resolved (9 µs, ratio 1.025) | not resolved (18.5 µs, ratio 1.057) |
| 0.25 ms | **resolved** (277.5 µs, ratio 1.668) | not resolved (27.5 µs, ratio 1.051) | not resolved (-4.5 µs, ratio 1.042) |
| 0.5 ms | **resolved** (607 µs, ratio 2.19) | not resolved (16.5 µs, ratio 0.999) | not resolved (12 µs, ratio 1.024) |
| 1 ms | **resolved** (1052 µs, ratio 2.97) | not resolved (56.5 µs, ratio 1.064) | not resolved (4 µs, ratio 1.045) |
| 2 ms | **resolved** (2022 µs, ratio 4.978) | not resolved (14.5 µs, ratio 1.051) | not resolved (26.5 µs, ratio 1.048) |
| 4 ms | **resolved** (4097.5 µs, ratio 10.299) | not resolved (-31 µs, ratio 1.036) | not resolved (16.5 µs, ratio 1.058) |

**This harness sees 0.25 ms at the synchronous position, nothing at all up to 4 ms at the microtask position, nothing at all up to 4 ms at the macrotask position.**

The headline metric is `EventDispatch` filtered to `input`, and that event closes before a microtask runs. A runtime that defers its work — form-contract coalesces its validation pass to a microtask — is therefore cheap on this metric BY CONSTRUCTION, and the microtask and macrotask columns above are the measurement that says so rather than an argument that it might be true.

### Null bands — each subject against a byte-identical twin

Two byte-identical pages measured as sequential halves once reported **0.8891** — an 11% difference between a page and its own copy. Interleaved, the same pages read 0.9956 / 0.9897 / 1.0040. Every band below is taken interleaved, at the same size and pair count as the comparison it is used to judge.

| shape | subject | p10 | median | p90 | pairs | dropped | spread |
|---|---|---|---|---|---|---|---|
| leaves-31 | `hand-written-per-field-state` | 0.874 | 0.972 | 1.143 | 21 | 0 | 37.7% |
| leaves-31 | `form-contract-use-field` | 0.877 | 1.006 | 1.076 | 21 | 0 | 32.3% |
| leaves-31 | `react-hook-form-scoped` | 0.884 | 0.984 | 1.164 | 21 | 0 | 60.2% |
| leaves-31 | `react-hook-form-deps` | 0.903 | 0.992 | 1.078 | 21 | 0 | 53.5% |
| leaves-31 | `react-hook-form-on-submit` | 0.782 | 0.96 | 1.145 | 21 | 0 | 88.4% |
| leaves-31 | `formik-use-field` | 0.914 | 1.013 | 1.087 | 21 | 0 | 82.5% |
| leaves-31 | `formik-fast-field` | 0.895 | 0.969 | 1.066 | 21 | 0 | 54.8% |
| leaves-31 | `tanstack-form-level` | 0.931 | 0.978 | 1.065 | 21 | 0 | 23.6% |
| leaves-61 | `hand-written-per-field-state` | 0.857 | 0.945 | 1.09 | 21 | 0 | 72.3% |
| leaves-61 | `form-contract-use-field` | 0.787 | 1.021 | 1.227 | 21 | 0 | 73.7% |
| leaves-61 | `react-hook-form-scoped` | 0.87 | 0.978 | 1.047 | 21 | 0 | 37% |
| leaves-61 | `react-hook-form-deps` | 0.881 | 1.034 | 1.114 | 21 | 0 | 46% |
| leaves-61 | `react-hook-form-on-submit` | 0.798 | 1.07 | 1.212 | 21 | 0 | 94.6% |
| leaves-61 | `formik-use-field` | 0.888 | 1.037 | 1.151 | 21 | 0 | 58.7% |
| leaves-61 | `formik-fast-field` | 0.951 | 1.058 | 1.19 | 21 | 0 | 43.3% |
| leaves-61 | `tanstack-form-level` | 0.943 | 0.994 | 1.071 | 21 | 0 | 21.6% |
| leaves-201 | `hand-written-per-field-state` | 0.87 | 0.949 | 1.126 | 21 | 0 | 46.9% |
| leaves-201 | `form-contract-use-field` | 0.912 | 1.005 | 1.149 | 21 | 0 | 35.4% |
| leaves-201 | `react-hook-form-scoped` | 0.948 | 0.996 | 1.046 | 21 | 0 | 18.3% |
| leaves-201 | `react-hook-form-deps` | 0.844 | 0.996 | 1.14 | 21 | 0 | 43.4% |
| leaves-201 | `react-hook-form-on-submit` | 0.785 | 0.943 | 1.101 | 21 | 0 | 46.7% |
| leaves-201 | `formik-use-field` | 0.964 | 0.999 | 1.024 | 21 | 0 | 15.6% |
| leaves-201 | `formik-fast-field` | 0.961 | 1.001 | 1.03 | 21 | 0 | 17.7% |
| leaves-201 | `tanstack-form-level` | 0.991 | 1.046 | 1.186 | 21 | 0 | 28.7% |

## §1 — The comparisons

### leaves-31 — 31 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 2.844 (2.523–3.243) | 888 µs | 309.5 µs | 52.1 µs | 100% | 835.9 µs | 2.49–3.592 | 21 / 0 | 38.8% | **slower** |
| `formik-use-field` | on-change | 2.6 (2.234–3.045) | 612 µs | 223.5 µs | 37.5 µs | 100% | 574.5 µs | 1.97–3.261 | 21 / 0 | 49.6% | **slower** |
| `formik-fast-field` | on-change | 1.954 (1.784–2.141) | 594 µs | 305.5 µs | 47.1 µs | 100% | 546.9 µs | 1.762–2.214 | 21 / 0 | 23.1% | **slower** |
| `react-hook-form-deps` | on-change | 1.003 (0.959–1.133) | 192.5 µs | 192.5 µs | 38.3 µs | 100% | 154.2 µs | 0.882–1.151 | 21 / 0 | 26.8% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.984 (0.882–1.073) | 176.5 µs | 179 µs | 20 µs | 0% | n/a — the pass is outside the dispatch | 0.815–1.121 | 21 / 0 | 31.1% | **indistinguishable** |
| `react-hook-form-scoped` | on-change | 0.973 (0.866–1.092) | 203 µs | 212 µs | 39.6 µs | 100% | 163.4 µs | 0.754–1.292 | 21 / 0 | 55.3% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.54 (0.499–0.615) | 125 µs | 229.5 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.461–0.695 | 21 / 0 | 43.2% | **indistinguishable** |

- `react-hook-form-deps`: the band 0.959–1.133 overlaps the null band 0.874–1.143
- `form-contract-use-field`: the band 0.882–1.073 overlaps the null band 0.874–1.143
- `react-hook-form-scoped`: the band 0.866–1.092 overlaps the null band 0.874–1.164
- `react-hook-form-on-submit`: 104.5 µs is under the smallest cost this harness resolved (250 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 20 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-61 — 61 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 4.5 (3.785–5.024) | 924.5 µs | 195 µs | 31.3 µs | 100% | 893.3 µs | 3.357–5.75 | 21 / 0 | 53.2% | **slower** |
| `formik-use-field` | on-change | 3.414 (2.547–4.465) | 907.5 µs | 295 µs | 71.3 µs | 100% | 836.3 µs | 2.377–4.543 | 21 / 0 | 63.4% | **slower** |
| `formik-fast-field` | on-change | 2.544 (2.158–2.746) | 504.5 µs | 201 µs | 37.5 µs | 100% | 467 µs | 1.307–3.301 | 21 / 0 | 78.4% | **slower** |
| `react-hook-form-scoped` | on-change | 0.923 (0.842–1.115) | 369.5 µs | 390.5 µs | 83.3 µs | 100% | 286.2 µs | 0.818–1.223 | 21 / 0 | 43.9% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.918 (0.821–1.064) | 360.5 µs | 392.5 µs | 91.3 µs | 100% | 269.3 µs | 0.535–1.083 | 21 / 0 | 59.7% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.857 (0.619–0.983) | 175 µs | 206 µs | 35.4 µs | 0% | n/a — the pass is outside the dispatch | 0.612–1.197 | 21 / 0 | 68.2% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.542 (0.456–0.596) | 210 µs | 394 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.282–0.658 | 21 / 0 | 69.3% | **indistinguishable** |

- `react-hook-form-scoped`: the band 0.842–1.115 overlaps the null band 0.857–1.09
- `react-hook-form-deps`: the band 0.821–1.064 overlaps the null band 0.857–1.114
- `form-contract-use-field`: the band 0.619–0.983 overlaps the null band 0.787–1.227
- `react-hook-form-on-submit`: 184 µs is under the smallest cost this harness resolved (250 µs)

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 35.4 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

### leaves-201 — 201 rendered fields

Ratios are `subject ÷ hand-written-per-field-state`, above 1 meaning slower. The statistic is the median of the PER-PAIR ratios, never the ratio of two medians. Spread is peak-to-peak over the median and is an upper bound on disturbance, not a confidence interval.

The policy column is not decoration. A subject whose policy is on-submit does no validation during a keystroke BY DESIGN: its validator column reads 0 µs and its row is cheap for a documented design reason rather than for a performance one.

`of which validator` is per keystroke, taken by the harness-owned schema wrapper — the same wrapper that produces `validatorPasses` in the counts lane. `runtime` is `input handler − validator` and is a SUBTRACTION, not a measurement. It is only meaningful where the validation pass runs inside the dispatch: form-contract coalesces its pass to a microtask and react-hook-form's resolver is promise-based. Which of them is which is MEASURED, not assumed: the harness counts how many passes ran while the input event was being dispatched, and that share is the column beside it. Below 100%, the subtraction would invent a number and the cell says so.

| subject | policy | ratio (p10–p90) | input handler | denominator | of which validator | inside the dispatch | runtime (a subtraction) | full range | pairs / dropped | spread | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tanstack-form-level` | on-change | 5.908 (5.323–6.359) | 2520 µs | 420 µs | 140.4 µs | 100% | 2379.6 µs | 4.753–7.027 | 21 / 0 | 38.5% | **slower** |
| `formik-use-field` | on-change | 5.688 (5.311–6.083) | 2375.5 µs | 417 µs | 132.9 µs | 100% | 2242.6 µs | 4.681–6.519 | 21 / 0 | 32.3% | **slower** |
| `formik-fast-field` | on-change | 3.131 (2.908–3.332) | 1318.5 µs | 413.5 µs | 127.9 µs | 100% | 1190.6 µs | 2.813–3.584 | 21 / 0 | 24.6% | **slower** |
| `react-hook-form-scoped` | on-change | 1.058 (0.889–1.115) | 463.5 µs | 443.5 µs | 189.2 µs | 100% | 274.3 µs | 0.816–1.397 | 21 / 0 | 54.9% | **indistinguishable** |
| `react-hook-form-deps` | on-change | 0.995 (0.889–1.202) | 541.5 µs | 524.5 µs | 227.9 µs | 100% | 313.6 µs | 0.794–1.323 | 21 / 0 | 53.1% | **indistinguishable** |
| `form-contract-use-field` | on-change | 0.546 (0.508–0.592) | 223 µs | 410.5 µs | 132.1 µs | 0% | n/a — the pass is outside the dispatch | 0.448–0.611 | 21 / 0 | 30% | **indistinguishable** |
| `react-hook-form-on-submit` | on-submit | 0.28 (0.231–0.294) | 129.5 µs | 490.5 µs | 0 µs | 0% | n/a — the pass is outside the dispatch | 0.229–0.309 | 21 / 0 | 28.5% | **faster** |

- `react-hook-form-scoped`: the band 0.889–1.115 overlaps the null band 0.87–1.126
- `react-hook-form-deps`: the band 0.889–1.202 overlaps the null band 0.844–1.14
- `form-contract-use-field`: only 0% of its 132.1 µs of validator work per keystroke ran inside the dispatch this metric measures, and the ladder resolves nothing at all at the microtask position; a smaller handler figure here is partly about where the work was scheduled

**Read the deferring rows with the ladder in hand.** `form-contract-use-field` ran 1 pass(es) per keystroke, 132.1 µs of them, with 0% inside the dispatch. That work is real and it is not in the input-handler figure, because this harness's own ladder shows the metric cannot resolve a cost at the microtask position at all. The counts lane is where that work is counted rather than timed.

## §2 — Frame work

Style, layout and paint are the part of a keystroke that jsdom cannot see at all, which is the whole reason this lane exists beside the counts lane. Every figure is per keystroke, over the same window the row's ratio came from. Compare the Layout column against the input handler column in §1 before concluding anything from either: on this page layout alone is routinely larger than the whole script it follows, and a benchmark that publishes only the script reports a minority of the main-thread work and none of the part a person can see.

| shape | subject | UpdateLayoutTree | RecalcStyleCount | Layout | LayoutCount | Paint+PrePaint+Commit | GC |
|---|---|---|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 13.3 µs | 1 | 194.7 µs | 1 | 488.2 µs | 0 µs |
| leaves-31 | `react-hook-form-scoped` | 15.5 µs | 1 | 200.3 µs | 1 | 484.2 µs | 0 µs |
| leaves-31 | `react-hook-form-deps` | 13.5 µs | 1 | 190.1 µs | 1 | 477.7 µs | 0 µs |
| leaves-31 | `react-hook-form-on-submit` | 18 µs | 1 | 211.6 µs | 1 | 502.1 µs | 0 µs |
| leaves-31 | `formik-use-field` | 19.6 µs | 1 | 212 µs | 1 | 517.2 µs | 389.9 µs |
| leaves-31 | `formik-fast-field` | 27.9 µs | 1 | 261.5 µs | 1 | 568 µs | 0 µs |
| leaves-31 | `tanstack-form-level` | 28.3 µs | 1 | 262.9 µs | 1 | 569.8 µs | 216.5 µs |
| leaves-61 | `form-contract-use-field` | 14.4 µs | 1 | 293.3 µs | 1 | 792.3 µs | 0 µs |
| leaves-61 | `react-hook-form-scoped` | 26 µs | 1 | 351.2 µs | 1 | 924.1 µs | 0 µs |
| leaves-61 | `react-hook-form-deps` | 30.4 µs | 1 | 377.5 µs | 1 | 944.5 µs | 0 µs |
| leaves-61 | `react-hook-form-on-submit` | 28.6 µs | 1 | 381.8 µs | 1 | 973.3 µs | 0 µs |
| leaves-61 | `formik-use-field` | 16.3 µs | 1 | 323.8 µs | 1 | 824.2 µs | 381.1 µs |
| leaves-61 | `formik-fast-field` | 14.1 µs | 1 | 309.7 µs | 1 | 802.2 µs | 0 µs |
| leaves-61 | `tanstack-form-level` | 13.5 µs | 1 | 306.9 µs | 1 | 795.8 µs | 0 µs |
| leaves-201 | `form-contract-use-field` | 13.8 µs | 1 | 901.4 µs | 1 | 2140.2 µs | 0 µs |
| leaves-201 | `react-hook-form-scoped` | 15.8 µs | 1 | 856.1 µs | 1 | 2213.1 µs | 0 µs |
| leaves-201 | `react-hook-form-deps` | 18.3 µs | 1 | 866.2 µs | 1 | 2346.3 µs | 0 µs |
| leaves-201 | `react-hook-form-on-submit` | 14.5 µs | 1 | 834.7 µs | 1 | 2213.7 µs | 0 µs |
| leaves-201 | `formik-use-field` | 17.7 µs | 1 | 1067.3 µs | 1 | 2602.6 µs | 427.8 µs |
| leaves-201 | `formik-fast-field` | 15.1 µs | 1 | 859 µs | 1 | 2138.1 µs | 0 µs |
| leaves-201 | `tanstack-form-level` | 16.3 µs | 1 | 974.1 µs | 1 | 2643.5 µs | 0 µs |

### EventDispatch by type — the evidence for the filter

`inputHandlerMicroseconds` is EventDispatch filtered to `args.data.type === "input"`. On a 200-input page the per-type medians run keypress 650 µs, textInput 617, input 77, keydown 24, keyup 12, beforeinput 2 — a median over ALL of them once made a 200,000-iteration injected busy loop completely invisible. This driver dispatches the `input` event itself rather than synthesising a key sequence, so `input` is the only type in the window; the table is printed so that is a fact a reader can see rather than a claim.

| shape | subject | input dispatches | input | selectionchange |
|---|---|---|---|---|
| leaves-31 | `form-contract-use-field` | 12 | 176.5 µs | — |
| leaves-31 | `react-hook-form-scoped` | 12 | 203 µs | — |
| leaves-31 | `react-hook-form-deps` | 12 | 192.5 µs | — |
| leaves-31 | `react-hook-form-on-submit` | 12 | 125 µs | — |
| leaves-31 | `formik-use-field` | 12 | 612 µs | — |
| leaves-31 | `formik-fast-field` | 12 | 594 µs | — |
| leaves-31 | `tanstack-form-level` | 12 | 888 µs | 43 µs |
| leaves-61 | `form-contract-use-field` | 12 | 175 µs | — |
| leaves-61 | `react-hook-form-scoped` | 12 | 369.5 µs | — |
| leaves-61 | `react-hook-form-deps` | 12 | 360.5 µs | — |
| leaves-61 | `react-hook-form-on-submit` | 12 | 210 µs | — |
| leaves-61 | `formik-use-field` | 12 | 907.5 µs | — |
| leaves-61 | `formik-fast-field` | 12 | 504.5 µs | — |
| leaves-61 | `tanstack-form-level` | 12 | 924.5 µs | — |
| leaves-201 | `form-contract-use-field` | 12 | 223 µs | — |
| leaves-201 | `react-hook-form-scoped` | 12 | 463.5 µs | — |
| leaves-201 | `react-hook-form-deps` | 12 | 541.5 µs | — |
| leaves-201 | `react-hook-form-on-submit` | 12 | 129.5 µs | — |
| leaves-201 | `formik-use-field` | 12 | 2375.5 µs | — |
| leaves-201 | `formik-fast-field` | 12 | 1318.5 µs | — |
| leaves-201 | `tanstack-form-level` | 12 | 2520 µs | — |

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

Machine: AMD EPYC 7763 64-Core Processor, 2 cores, 7.8 GB, linux 6.17.0-1022-azure, node v23.11.1. react 19.3.0, react-dom 19.3.0, zod 4.6.1, react-hook-form 7.87.0, formik 2.4.9, @tanstack/react-form 1.33.5. Bundle 473 kB across both origins (http://127.0.0.1:5191 and http://127.0.0.1:5192). Run took 11 minutes.

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
