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

Wiring fibers, measured by mounting each subject with no fields at all: form-contract-use-field 6, hand-written-per-field-state 3, react-hook-form-scoped 7, react-hook-form-deps 7, react-hook-form-on-submit 7. The trees are compared with these taken out, and the figure is taken rather than declared.

form-contract is behind on 3 scenario(s); those rows are first:

- **K1**: 42 changed fibers against 0 for `react-hook-form-scoped`, which was scored **agrees**
- **K2**: 84 changed fibers against 0 for `react-hook-form-on-submit`, which was scored **agrees at submit only**
- **X1**: 84 changed fibers against 0 for `react-hook-form-scoped`, which was scored **disagrees**

| subject | scenario | agreement | commits | changed fibers | host fibers | DOM attrs | DOM nodes | validator passes | paths judged | tree fibers |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| form-contract-use-field | K1 | agrees | 1 | 42 | 5 | 7 | 0 | 1 | 31 | 192 |
| hand-written-per-field-state | K1 | agrees | 1 | 39 | 5 | 7 | 0 | 1 | 31 | 189 |
| react-hook-form-deps | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |
| react-hook-form-on-submit | K1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | K1 | agrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |
| form-contract-use-field | K2 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| hand-written-per-field-state | K2 | agrees | 1 | 39 | 5 | 8 | 1 | 1 | 31 | 189 |
| react-hook-form-deps | K2 | agrees | 1 | 43 | 5 | 7 | 1 | 1 | 31 | 193 |
| react-hook-form-on-submit | K2 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | K2 | agrees | 1 | 43 | 5 | 7 | 1 | 1 | 31 | 193 |
| form-contract-use-field | X1 | agrees | 2 | 84 | 10 | 11 | 1 | 1 | 31 | 192 |
| hand-written-per-field-state | X1 | agrees | 1 | 44 | 9 | 11 | 1 | 1 | 31 | 189 |
| react-hook-form-deps | X1 | agrees | 1 | 193 | 125 | 97 | 1 | 2 | 62 | 193 |
| react-hook-form-on-submit | X1 | agrees at submit only | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 193 |
| react-hook-form-scoped | X1 | disagrees | 0 | 0 | 0 | 3 | 0 | 1 | 31 | 193 |

## Policies

Each subject is scored at the moment its OWN policy claims a verdict, and the citation is the library documentation rather than our reading of it. The on-change policy is form-contract only policy; the default of the library it is compared against here is not.

| subject | policy | documented as | notes |
|---|---|---|---|
| form-contract-use-field | on-change | README: one whole-root validation pass per settled change; FormOptions carries no validation mode | No validation-mode knob exists; every settled change is judged. inputProps is not used, so the DOM matches the shared leaf exactly. |
| hand-written-per-field-state | on-change | written for this benchmark to judge on every change | One useState per leaf, a mutable root, one whole-root pass per change, per-path notification. No store, no library. |
| react-hook-form-scoped | on-change | react-hook-form useForm options: mode | register with a per-leaf useFormState({name, exact}). mode onChange, criteriaMode all, shouldUnregister false. The root reads no formState. |
| react-hook-form-deps | on-change | react-hook-form register options: deps | The scoped subject plus register(name, { deps }) on the one field the shared schema makes another field depend on. |
| react-hook-form-on-submit | on-submit | react-hook-form useForm options: mode defaults to onSubmit | The shipped default. Identical to the scoped subject except mode, so the difference between the two rows is the price of the mode alone. |

## Disagreements

- `react-hook-form-scoped` / X1 / messages at `billing.postcode`: subject undefined, oracle "same-as-billing is on but the postcodes differ"

