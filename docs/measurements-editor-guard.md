# Separating path inference from the inhabited-path guard

Historical record from before adoption: `current` in the raw samples is the old
signature; `guarded` is the candidate subsequently adopted in React `useField`.
The rerunnable command now compares adopted `current` against `before-guard`.
Recorded samples and hashes below are unchanged.

Run: `npm run bench:editor:guard`. Same Language Service host and timing boundaries
as [the original sweep](measurements-editor.md). Independent sequential processes,
with first variant reversed in every pair. No CPU profiler is active during timing.
Both variants retain adapter identity and check path validity. `guarded`
replaces only `Q & InhabitedFormPath<Q>` with the experimental parameter type
`Q & NoInfer<InhabitedFormPath<Q>>` in memory; package files are not edited.

Each variant's cell is a median of process medians over edited requests, in ms.
Percentage is the median of paired changes, with its observed min/max, not the
ratio of aggregate medians. Negative means guarded is faster. Warm unchanged,
cold, per-edit and memory samples are available in the raw record.

| workload | operation | pairs | baseline (ms) | guarded (ms) | paired change [range] |
|---|---|---:|---:|---:|---:|
| one-form-one-file | completion | 3 | 57.27 | 51.74 | -9.66% [-39.26–54.15]% |
| one-form-many-files | completion | 3 | 76.76 | 54.20 | -29.38% [-31.24–-20.28]% |
| ten-forms | completion | 3 | 277.98 | 205.54 | -22.20% [-26.06–-6.52]% |
| thirty-forms | completion | 6 | 369.11 | 242.97 | -35.13% [-44.58–-21.02]% |
| deep-form | completion | 3 | 213.48 | 189.70 | -11.14% [-23.77–-2.33]% |
| thirty-mixed | completion | 3 | 249.32 | 229.18 | -6.11% [-9.01–-1.85]% |
| thirty-forms | hover | 3 | 121.04 | 123.13 | 1.72% [-4.96–7.35]% |
| thirty-forms | diagnostics | 3 | 185.86 | 183.47 | -3.11% [-30.54–0.05]% |

`thirty-mixed` varies leaf types between string, number and boolean by form;
the probe remains in the first string-valued form. Other workload shapes match the
original sweep. The correctness audit checks every generated view, requires valid
completion candidates and refuses a deliberate typo. Timing is not a CI gate.
This is synthetic TypeScript 5.9 behavior, not a universal editor latency promise.

Recorded 2026-09-17T22:05:07.671Z; TypeScript 5.9.3; Node v23.11.0.
Machine: AMD Ryzen 7 5825U with Radeon Graphics; 16 logical CPUs;
15.3 GiB; win32 10.0.26200.
Declaration SHA-256: `88afd920f5f982876f67be513cc4cc8e31a12df56a6e94f7716e695d4d5005f7`.
[Raw paired samples and source hashes](measurements-editor-guard.json).
