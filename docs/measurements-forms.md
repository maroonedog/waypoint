# Form runtime comparison — counts lane

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

## Policies

Each subject is scored at the moment its OWN policy claims a verdict, and the citation is the library documentation rather than our reading of it. The on-change policy is the only policy form-contract has; the default of three of the libraries beside it is not.

| subject | library | policy | documented as | notes |
|---|---|---|---|---|
| form-contract-use-field | form-contract | on-change | README: one whole-root validation pass per settled change; FormOptions carries no validation mode | No validation-mode knob exists; every settled change is judged. inputProps is not used, so the DOM matches the shared leaf exactly. |
| hand-written-per-field-state | (none) | on-change | written for this benchmark to judge on every change | One useState per leaf, a mutable root, one whole-root pass per change, per-path notification. No store, no library. |
| react-hook-form-scoped | react-hook-form | on-change | react-hook-form useForm options: mode | register with a per-leaf useFormState({name, exact}). mode onChange, criteriaMode all, shouldUnregister false. The root reads no formState. |
| react-hook-form-deps | react-hook-form | on-change | react-hook-form register options: deps | The scoped subject plus register(name, { deps }) on the one field the shared schema makes another field depend on. |
| react-hook-form-on-submit | react-hook-form | on-submit | react-hook-form useForm options: mode defaults to onSubmit | The shipped default. Identical to the scoped subject except mode, so the difference between the two rows is the price of the mode alone. |
| formik-use-field | formik | on-change | formik: validateOnChange defaults to true | validate, not validationSchema: prepareDataForValidation rewrites empty strings to undefined, which invents errors on a valid zod root. validateOnChange and validateOnBlur left at their defaults. |
| formik-fast-field | formik | on-change | formik: validateOnChange defaults to true | FastField, which skips a re-render unless its own value, error or touched flag moved. validateOnChange left on, so this row differs from the useField row in the render path alone; the documented pairing with validateOnChange: false is a further saving not measured here. |
| tanstack-form-level | @tanstack/react-form | on-change | TanStack Form: validators.onChange | The shared schema as a form-level Standard Schema validator, read through useField rather than the render-prop form.Field. Mounting a FormApi subscribes a devtools observer that cannot be switched off. |

## leaves-31 — 31 rendered fields

Wiring fibers, measured by mounting each subject with no fields at all: form-contract-use-field 6, hand-written-per-field-state 3, react-hook-form-scoped 7, react-hook-form-deps 7, react-hook-form-on-submit 7, formik-use-field 5, formik-fast-field 5, tanstack-form-level 4. The trees are compared with these taken out, and the figure is taken rather than declared.

form-contract is behind on 3 scenario(s); those rows are first:

- **K1**: 42 changed fibers against 0 for `react-hook-form-scoped`, which was scored **agrees**
- **K2**: 84 changed fibers against 0 for `react-hook-form-on-submit`, which was scored **agrees at submit only**
- **X1**: 84 changed fibers against 0 for `react-hook-form-scoped`, which was scored **disagrees**

| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| form-contract-use-field | K1 | agrees | 1 | 42 | 5 | 7 | 0 | 1 | 31 | 192 |
| formik-fast-field | K1 | agrees | 2 | 263 | 6 | 7 | 0 | 1 | 31 | 284 |
| formik-use-field | K1 | agrees | 2 | 382 | 250 | 190 | 0 | 1 | 31 | 191 |
| hand-written-per-field-state | K1 | agrees | 1 | 39 | 5 | 7 | 0 | 1 | 31 | 189 |
| react-hook-form-deps | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |
| react-hook-form-on-submit | K1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |
| tanstack-form-level | K1 | agrees | 1 | 40 | 5 | 7 | 0 | 1 | 31 | 190 |
| form-contract-use-field | K2 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| formik-fast-field | K2 | agrees | 2 | 268 | 10 | 11 | 1 | 1 | 31 | 284 |
| formik-use-field | K2 | agrees | 2 | 382 | 250 | 191 | 1 | 1 | 31 | 191 |
| hand-written-per-field-state | K2 | agrees | 1 | 39 | 5 | 8 | 1 | 1 | 31 | 189 |
| react-hook-form-deps | K2 | agrees | 1 | 43 | 5 | 7 | 1 | 1 | 31 | 193 |
| react-hook-form-on-submit | K2 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | K2 | agrees | 1 | 43 | 5 | 7 | 1 | 1 | 31 | 193 |
| tanstack-form-level | K2 | agrees | 1 | 40 | 5 | 8 | 1 | 1 | 31 | 190 |
| form-contract-use-field | X1 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| formik-fast-field | X1 | agrees | 2 | 268 | 10 | 11 | 1 | 1 | 31 | 284 |
| formik-use-field | X1 | agrees | 2 | 382 | 250 | 191 | 1 | 1 | 31 | 191 |
| hand-written-per-field-state | X1 | agrees | 1 | 44 | 9 | 11 | 1 | 1 | 31 | 189 |
| react-hook-form-deps | X1 | agrees | 1 | 193 | 125 | 97 | 1 | 2 | 62 | 193 |
| react-hook-form-on-submit | X1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | X1 | disagrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |
| tanstack-form-level | X1 | agrees | 1 | 45 | 9 | 11 | 1 | 1 | 31 | 190 |

### Disagreements

- `react-hook-form-scoped` / X1: showed no message

## leaves-61 — 61 rendered fields

Wiring fibers, measured by mounting each subject with no fields at all: form-contract-use-field 6, hand-written-per-field-state 3, react-hook-form-scoped 7, react-hook-form-deps 7, react-hook-form-on-submit 7, formik-use-field 5, formik-fast-field 5, tanstack-form-level 4. The trees are compared with these taken out, and the figure is taken rather than declared.

form-contract is behind on 3 scenario(s); those rows are first:

- **K1**: 72 changed fibers against 0 for `react-hook-form-scoped`, which was scored **agrees**
- **K2**: 144 changed fibers against 0 for `react-hook-form-on-submit`, which was scored **agrees at submit only**
- **X1**: 144 changed fibers against 0 for `react-hook-form-scoped`, which was scored **disagrees**

| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| form-contract-use-field | K1 | agrees | 1 | 72 | 5 | 7 | 0 | 1 | 61 | 372 |
| formik-fast-field | K1 | agrees | 2 | 503 | 6 | 7 | 0 | 1 | 61 | 554 |
| formik-use-field | K1 | agrees | 2 | 742 | 490 | 370 | 0 | 1 | 61 | 371 |
| hand-written-per-field-state | K1 | agrees | 1 | 69 | 5 | 7 | 0 | 1 | 61 | 369 |
| react-hook-form-deps | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 61 | 373 |
| react-hook-form-on-submit | K1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 373 |
| react-hook-form-scoped | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 61 | 373 |
| tanstack-form-level | K1 | agrees | 1 | 70 | 5 | 7 | 0 | 1 | 61 | 370 |
| form-contract-use-field | K2 | agrees | 2 | 144 | 10 | 11 | 1 | 1 | 61 | 372 |
| formik-fast-field | K2 | agrees | 2 | 508 | 10 | 11 | 1 | 1 | 61 | 554 |
| formik-use-field | K2 | agrees | 2 | 742 | 490 | 371 | 1 | 1 | 61 | 371 |
| hand-written-per-field-state | K2 | agrees | 1 | 69 | 5 | 8 | 1 | 1 | 61 | 369 |
| react-hook-form-deps | K2 | agrees | 1 | 73 | 5 | 7 | 1 | 1 | 61 | 373 |
| react-hook-form-on-submit | K2 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 373 |
| react-hook-form-scoped | K2 | agrees | 1 | 73 | 5 | 7 | 1 | 1 | 61 | 373 |
| tanstack-form-level | K2 | agrees | 1 | 70 | 5 | 8 | 1 | 1 | 61 | 370 |
| form-contract-use-field | X1 | agrees | 2 | 144 | 10 | 11 | 1 | 1 | 61 | 372 |
| formik-fast-field | X1 | agrees | 2 | 508 | 10 | 11 | 1 | 1 | 61 | 554 |
| formik-use-field | X1 | agrees | 2 | 742 | 490 | 371 | 1 | 1 | 61 | 371 |
| hand-written-per-field-state | X1 | agrees | 1 | 74 | 9 | 11 | 1 | 1 | 61 | 369 |
| react-hook-form-deps | X1 | agrees | 1 | 373 | 245 | 187 | 1 | 2 | 122 | 373 |
| react-hook-form-on-submit | X1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 373 |
| react-hook-form-scoped | X1 | disagrees | 0 | 0 | 0 | 3 | 0 | 1 | 61 | 373 |
| tanstack-form-level | X1 | agrees | 1 | 75 | 9 | 11 | 1 | 1 | 61 | 370 |

### Disagreements

- `react-hook-form-scoped` / X1: showed no message

## leaves-201 — 201 rendered fields

Wiring fibers, measured by mounting each subject with no fields at all: form-contract-use-field 6, hand-written-per-field-state 3, react-hook-form-scoped 7, react-hook-form-deps 7, react-hook-form-on-submit 7, formik-use-field 5, formik-fast-field 5, tanstack-form-level 4. The trees are compared with these taken out, and the figure is taken rather than declared.

form-contract is behind on 3 scenario(s); those rows are first:

- **K1**: 212 changed fibers against 0 for `react-hook-form-scoped`, which was scored **agrees**
- **K2**: 424 changed fibers against 0 for `react-hook-form-on-submit`, which was scored **agrees at submit only**
- **X1**: 424 changed fibers against 0 for `react-hook-form-scoped`, which was scored **disagrees**

| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| form-contract-use-field | K1 | agrees | 1 | 212 | 5 | 7 | 0 | 1 | 201 | 1212 |
| formik-fast-field | K1 | agrees | 2 | 1623 | 6 | 7 | 0 | 1 | 201 | 1814 |
| formik-use-field | K1 | agrees | 2 | 2422 | 1610 | 1210 | 0 | 1 | 201 | 1211 |
| hand-written-per-field-state | K1 | agrees | 1 | 209 | 5 | 7 | 0 | 1 | 201 | 1209 |
| react-hook-form-deps | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 201 | 1213 |
| react-hook-form-on-submit | K1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 1213 |
| react-hook-form-scoped | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 201 | 1213 |
| tanstack-form-level | K1 | agrees | 1 | 210 | 5 | 7 | 0 | 1 | 201 | 1210 |
| form-contract-use-field | K2 | agrees | 2 | 424 | 10 | 11 | 1 | 1 | 201 | 1212 |
| formik-fast-field | K2 | agrees | 2 | 1628 | 10 | 11 | 1 | 1 | 201 | 1814 |
| formik-use-field | K2 | agrees | 2 | 2422 | 1610 | 1211 | 1 | 1 | 201 | 1211 |
| hand-written-per-field-state | K2 | agrees | 1 | 209 | 5 | 8 | 1 | 1 | 201 | 1209 |
| react-hook-form-deps | K2 | agrees | 1 | 213 | 5 | 7 | 1 | 1 | 201 | 1213 |
| react-hook-form-on-submit | K2 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 1213 |
| react-hook-form-scoped | K2 | agrees | 1 | 213 | 5 | 7 | 1 | 1 | 201 | 1213 |
| tanstack-form-level | K2 | agrees | 1 | 210 | 5 | 8 | 1 | 1 | 201 | 1210 |
| form-contract-use-field | X1 | agrees | 2 | 424 | 10 | 11 | 1 | 1 | 201 | 1212 |
| formik-fast-field | X1 | agrees | 2 | 1628 | 10 | 11 | 1 | 1 | 201 | 1814 |
| formik-use-field | X1 | agrees | 2 | 2422 | 1610 | 1211 | 1 | 1 | 201 | 1211 |
| hand-written-per-field-state | X1 | agrees | 1 | 214 | 9 | 11 | 1 | 1 | 201 | 1209 |
| react-hook-form-deps | X1 | agrees | 1 | 1213 | 805 | 607 | 1 | 2 | 402 | 1213 |
| react-hook-form-on-submit | X1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 1213 |
| react-hook-form-scoped | X1 | disagrees | 0 | 0 | 0 | 3 | 0 | 1 | 201 | 1213 |
| tanstack-form-level | X1 | agrees | 1 | 215 | 9 | 11 | 1 | 1 | 201 | 1210 |

### Disagreements

- `react-hook-form-scoped` / X1: showed no message
