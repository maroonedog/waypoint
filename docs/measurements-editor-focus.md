# Focused confirmation: editing completion with thirty forms

Run: `npm run bench:editor:focus`. Same workload, TypeScript Language Service host,
correctness assertions and timing boundaries as [the sweep](measurements-editor.md).
Each pair uses fresh sequential processes. First variant alternates on every pair.
This is an independent follow-up, not pooled into the original sweep.
No timing threshold is enforced. Counterfactual identity removal is not a safe API.

| pair | first variant | current edited median (ms) | counterfactual edited median (ms) | change |
|---|---|---:|---:|---:|
| 1 | current | 544.66 | 302.97 | 79.77% |
| 2 | without-identity | 349.53 | 240.52 | 45.32% |
| 3 | current | 347.93 | 260.90 | 33.35% |
| 4 | without-identity | 340.85 | 243.11 | 40.21% |
| 5 | current | 356.04 | 252.45 | 41.03% |
| 6 | without-identity | 423.09 | 261.22 | 61.97% |

Median across pairs: current **352.79 ms**;
counterfactual **256.68 ms**.
Median paired change: **43.18%**
(range 33.35% to 79.77%).

Recorded 2026-09-17T21:30:03.429Z; TypeScript 5.9.3; Node v23.11.0.
Declaration SHA-256: `88afd920f5f982876f67be513cc4cc8e31a12df56a6e94f7716e695d4d5005f7`.
Raw timings, correctness evidence, endpoint memory and source hashes:
[measurements-editor-focus.json](measurements-editor-focus.json).

This isolates an emitted-declaration change in a synthetic all-string application.
It does not identify the compiler's internal hot path or establish editor UI latency.
All files are program roots, but other view bodies can remain lazily checked until
the untimed audit. Background project-wide diagnostics are not simulated.
