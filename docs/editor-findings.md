# Findings from the pre-publication editor measurements

Evidence: [full sweep](measurements-editor.md), [focused confirmation](measurements-editor-focus.md).
Both reports link their raw samples, compiler version and measured declaration hash.

## What warrants investigation

The sweep's median edited completion request was 54.34 ms for one form with a
single view file, 59.32 ms when those calls were split into separate files,
268.61 ms with ten forms, and 520.86 ms with thirty forms. The larger workloads
also increase total leaves and calls, so this does not isolate form count.
In contrast, unchanged repeated completion requests were around 1–3 ms: cached
requests are not a proxy for typing performance.

The thirty-form completion comparison showed an identity-member cost in every
pair of the sweep. A separate six-pair run reversed variant order each time and
again found current slower in every pair: +33.35% to +79.77%, with a median paired
change of +43.18%. Across that run's per-process medians, current was 352.79 ms
and the counterfactual was 256.68 ms. The percentage is a median of paired ratios,
not the ratio of those two aggregate medians.

Absolute times changed appreciably between the sweep and follow-up. These are
machine-sensitive observations, not a promise that thirty forms always cost a
particular delay. They do, however, justify profiling edited completion with
the adapter identity member present. Other operations and smaller workloads do
not show a uniform identity penalty in this sweep.

## Profile and adopted optimization

The edited-request CPU profile points to string-literal completion candidate
resolution and generic inference. In the local TypeScript 5.9.3 implementation,
`getCandidateSignaturesForStringLiteralCompletions` resolves call signatures while
blocking inference from the edited argument. The parameter
`Q & InhabitedFormPath<Q>` still exposes a value-dependent guard to inference.

An experiment used `Q & NoInfer<InhabitedFormPath<Q>>`: infer the path from `Q`,
then check the guard. It retained adapter identity, passed the existing type tests
and the package-composition regression test, and preserved completion candidates,
hover value types and typo rejection in the benchmark.

[Alternating paired measurements](measurements-editor-guard.md) found:

| edited request | baseline median | experimental median | median paired change |
|---|---:|---:|---:|
| thirty-form completion (6 pairs) | 369.11 ms | 242.97 ms | -35.13% |
| thirty-form diagnostics (3 pairs) | 185.86 ms | 183.47 ms | -3.11% |
| ten-form completion (3 pairs) | 277.98 ms | 205.54 ms | -22.20% |

This repeat was started after the user reported that the PC was no longer busy.
No builds or tests ran concurrently with measurement. Completion improved in
every thirty-form pair (-44.58% to -21.02%). Ten-form, deep and mixed-value
completion also improved in every pair; one-form/single-file results remained
variable. Thirty-form hover changed by a median +1.72% (-4.96% to +7.35%).

The [initial run](measurements-editor-guard-initial.md) showed slower diagnostics
in every pair, leading to provisional rejection. The user then reported a busy
PC and requested a pause. After resuming, that diagnostic regression did not
reproduce: paired changes ranged from -30.54% to +0.05%. System load was not
instrumented, so do not attribute the earlier difference conclusively to load.
The initial rejection is withdrawn: this is a promising completion optimization,
with no consistent diagnostic penalty in the repeat. Following approval, the
NoInfer guard was adopted in React `useField`. Generic forwarding, union value
inference and invalid record suffixes have explicit type regression coverage.
These synthetic results alone do not establish universal improvement.

The [profile summary](editor-profile-summary.json) includes overlapping inclusive
sample shares: `inferTypes` fell from about 56% to 6%, while
`isTypeAssignableTo` fell from 58% to 23%. Those shares cannot be added together
or interpreted as elapsed-time savings. Profiling was limited to edited requests;
the separate timing comparison ran without the profiler. Raw captures:
[baseline](editor-before-guard.cpuprofile), [candidate](editor-after-guard.cpuprofile).
The candidate capture used an equivalent in-memory signature transformation.
Use `node bench/editor/summarize-profile.mjs <profile>` to inspect a capture.

The initial comparison's `current` label means the candidate as it existed during
that experiment; `before-guard` means baseline. The recorded repeat uses `current`
for baseline and `guarded` for the candidate. After adoption, the rerunnable
`npm run bench:editor:guard` uses `current` for the adopted signature and
`before-guard` for the old signature reconstructed in memory. Both recorded runs'
raw results and original hashes are preserved separately.

## Next engineering decision

Keep the identity fix and its package-composition regression tests. Removing it
restores silent incompatible registration, so the counterfactual is evidence,
not a proposed release configuration.

1. Measure representative application models, including schema edits and
   array/union-heavy forms, before extending the optimization to other APIs.
2. Keep diagnostic and hover controls alongside completion measurements.
   Preserve typo rejection,
   per-form value inference, shared-control declarations and duplicate-key
   detection as mandatory correctness checks.
3. Re-run the same paired workloads on the same compiler before accepting a
   performance change. Include the smaller/deeper shapes to detect a tradeoff.

The full-sweep ordering rotates workloads and chooses pair order from the trial,
position and operation. It does not ensure that each particular case reverses
order every trial; the focused follow-up explicitly does so. Neither run simulates
project-wide diagnostics running concurrently in an editor. All files are roots,
but other view bodies may be checked lazily until the untimed correctness audit.

Runtime input latency, schema edits, array/union-heavy models and real editor UI
latency remain unmeasured here. Publication is not needed to investigate this
reproducible completion cost.
