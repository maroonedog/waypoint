# Separating path inference from the inhabited-path guard

Historical experiment: `current` below means the experimental NoInfer signature,
which was subsequently rejected because diagnostics regressed. Product code was
restored. The rerunnable command now applies the candidate in memory as `guarded`
against the restored `current` baseline. Raw samples and hashes below are unchanged.
That rejection was subsequently withdrawn after a repeat did not reproduce the
diagnostic regression. See [the updated decision](editor-findings.md).

Run: `npm run bench:editor:guard`. Same Language Service host and timing boundaries
as [the original sweep](measurements-editor.md). Independent sequential processes,
with first variant reversed in every pair. No CPU profiler is active during timing.
Both variants retain adapter identity and check path validity. `before-guard`
replaces only `Q & NoInfer<InhabitedFormPath<Q>>` with the old parameter type
`Q & InhabitedFormPath<Q>` in memory; package files are not edited.

Each variant's cell is a median of process medians over edited requests, in ms.
Percentage is the median of paired changes, with its observed min/max, not the
ratio of aggregate medians. Negative means current is faster. Warm unchanged,
cold, per-edit and memory samples are available in the raw record.

| workload | operation | pairs | before (ms) | current (ms) | paired change [range] |
|---|---|---:|---:|---:|---:|
| one-form-one-file | completion | 3 | 56.72 | 41.13 | -21.14% [-27.49–-18.07]% |
| one-form-many-files | completion | 3 | 56.79 | 47.09 | -16.53% [-27.38–-15.60]% |
| ten-forms | completion | 3 | 137.91 | 178.84 | 23.48% [-9.53–29.68]% |
| thirty-forms | completion | 6 | 373.47 | 256.38 | -37.12% [-42.10–-18.53]% |
| deep-form | completion | 3 | 138.90 | 116.89 | -17.30% [-20.30–-7.87]% |
| thirty-mixed | completion | 3 | 256.62 | 245.64 | -2.41% [-13.98–4.98]% |
| thirty-forms | hover | 3 | 129.52 | 280.79 | 32.02% [-3.50–118.67]% |
| thirty-forms | diagnostics | 3 | 416.75 | 568.49 | 37.69% [11.99–41.08]% |

`thirty-mixed` varies leaf types between string, number and boolean by form;
the probe remains in the first string-valued form. Other workload shapes match the
original sweep. The correctness audit checks every generated view, requires valid
completion candidates and refuses a deliberate typo. Timing is not a CI gate.
This is synthetic TypeScript 5.9 behavior, not a universal editor latency promise.

Recorded 2026-09-17T21:43:16.534Z; TypeScript 5.9.3; Node v23.11.0.
Machine: AMD Ryzen 7 5825U with Radeon Graphics; 16 logical CPUs;
15.3 GiB; win32 10.0.26200.
Declaration SHA-256: `924ec455362c049f3df6745c87a48bf9b15d997a9a04754f4fa4ae9b13d9669e`.
[Raw paired samples and source hashes](measurements-editor-guard-initial.json).
