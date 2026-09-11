# Form runtime comparison — counts lane, slice 1

No milliseconds are published from this lane. jsdom does no layout and no paint, so a time taken here is not a time a person would experience. The counts below are integers and do not depend on the machine.

## What was measured on

| what | value |
|---|---|
| platform | win32 |
| release | 10.0.26200 |
| arch | x64 |
| cpu | AMD Ryzen 7 5825U with Radeon Graphics |
| cores | 16 |
| memoryGb | 15.3 |
| node | v23.11.0 |
| nodeEnv | production |
| reactVersion | 19.3.0 |
| profilerFired | false |
| strictModeUsed | false |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| zod | 4.6.1 |
| react-hook-form | 7.87.0 |
| @hookform/resolvers | 5.9.1 |
| formik | 2.4.9 |
| @tanstack/react-form | 1.33.5 |
| zustand | 5.0.15 |
| jsdom | 26.1.0 |

## Counts

Wiring fibers, measured by mounting each subject with no fields at all: form-contract-use-field 6, hand-written-per-field-state 3. The trees are compared with these taken out, and the figure is taken rather than declared.

form-contract is behind on 3 scenario(s); those rows are first:

- **K1**: 42 changed fibers against 39 for `hand-written-per-field-state`
- **K2**: 84 changed fibers against 39 for `hand-written-per-field-state`
- **X1**: 84 changed fibers against 44 for `hand-written-per-field-state`

| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| form-contract-use-field | K1 | agrees | 1 | 42 | 5 | 7 | 0 | 1 | 31 | 192 |
| hand-written-per-field-state | K1 | agrees | 1 | 39 | 5 | 7 | 0 | 1 | 31 | 189 |
| form-contract-use-field | K2 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| hand-written-per-field-state | K2 | agrees | 1 | 39 | 5 | 8 | 1 | 1 | 31 | 189 |
| form-contract-use-field | X1 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| hand-written-per-field-state | X1 | agrees | 1 | 44 | 9 | 11 | 1 | 1 | 31 | 189 |

## Disagreements

None. Every subject showed what the oracle expected, on every channel.

