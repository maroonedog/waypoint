# `bench/` — the form-runtime comparison harness for `C:/projects/form-contract`

Command: `npm run bench:forms`. Baselines: `C:/projects/form-contract/config/form-baseline.json` (+ `.ci.json`). Report: `C:/projects/form-contract/docs/measurements-forms.md`.

Built from the agreement-first design, with the null experiment and calibration ladder from the browser design, the harness-owned fiber counting from the counts design, and every attack disposition recorded in Appendix A.

---

## 1. The decision

Five form runtimes plus two hand-written references are driven through one scripted transcript against **one zod schema instance the harness owns and instruments**, rendering **one DOM the harness owns and hashes**, in **two lanes**: a *counts lane* (jsdom, production React, deterministic integers, gated in CI on every push) and a *time lane* (headless Chrome over CDP, microseconds taken from the browser's own trace, printed and never gated). Nothing is timed until every subject has been shown — reading the rendered DOM only — to have reached the same observable state *within its own declared validation policy*, and the policy is an axis of the matrix rather than a defect of the competitor. What makes it trustworthy is five mechanisms a sceptic can check without trusting the author: **(a)** no count is produced by code any adapter author wrote — renders come from fiber alternates, validation work from a harness-owned schema wrapper, DOM changes from a `MutationObserver`, so there is no counter to place favourably; **(b)** the validator wrapper records passes, paths judged **and** nanoseconds, so "fast because it validated less" and "cheap because the store is cheap" are arithmetically separable; **(c)** the harness publishes its own resolution *above* its results — a null experiment (form-contract against a byte-identical twin) and a calibration ladder with known cost injected at three scheduling positions — and any band overlapping the null band prints `indistinguishable`, never a win; **(d)** both ends of every library's dial are published **including form-contract's** (zustand store, `<Field>` render prop, `AutoForm`); **(e)** losses sort first, are gated by row *identity* rather than count, and a disappearing loss row fails CI until a reviewed recalibration diff explains it.

---

## 2. The libraries, and the idiomatic code

Versions are read at run time from `node_modules/<pkg>/package.json` on disk (never from `devDependencies`, which carries a range). Installed today: `react-hook-form@7.87.0`, `formik@2.4.9`, `@tanstack/react-form@1.33.5`, `@hookform/resolvers@5.9.1`, `react@19.3.0`, `zod@4.x`, `zustand@5.0.9`.

### 2.0 Two rules that make the code comparable

**No JSX anywhere.** Verified on the installed Node 23: `--experimental-strip-types` does not strip `.tsx` — it loads it as plain JS and throws. Every subject is a `.ts` file using `React.createElement` (aliased `h`). The browser lane builds the *same* `.ts` files through vite, so the two lanes cannot diverge by a build step.

**Two tree classes.** A subject in class `equal-tree` renders the harness's `shared-leaf.ts` with **no additional component boundary**, and `assert-tree-fibers-match.ts` fails the run if its `treeFibers` differs from any other `equal-tree` subject for the same shape. A subject whose idiom structurally requires a boundary (Formik `FastField`, TanStack `form.Field` render prop, form-contract `<Field>`, `AutoForm`) is class `own-tree`: it publishes `treeFibers` and a `Δfibers` column, and its fiber counts are never printed beside an `equal-tree` subject without that delta on the same row. This closes the 605-vs-405 rig without pretending a render-prop API does not exist.

`shared-leaf.ts` owns the `<label>`, the `<input>`, the `aria-invalid` attribute and the `<em>` message node. A subject supplies only `{ value, onInput, onBlur, invalid, message }`.

### 2.1 form-contract — `useField`, shipped store (`equal-tree`, the primary row)

```ts
// bench/subjects/form-contract-use-field-subject.ts
const Leaf = ({ path, label }: LeafProps) => {
  const f = useField(path);
  return h(SharedLeaf, {
    label, name: path,
    value: f.value ?? "",
    onInput: (e: FieldChangeEvent) => f.setValue(e.currentTarget.value),
    onBlur: f.markTouched,
    invalid: f.issues.length > 0,
    message: f.issues[0]?.message,
  });
};
```

Knobs: there are three (`adapter`, `defaultValues`, `store`) and none of them is a validation mode — `FormOptions` in `packages/form-contract/src/core/runtime/form.types.ts` has no `validateOn` member, which design §7 item 3 lists among its mitigations. **That gap is a published row, in words, not folded into a number.** `f.inputProps` is deliberately not used: `build-input-props.ts` emits descriptor-derived `required`/`min`/`max`/`pattern`, which would change the DOM and therefore the layout cost. The `inputProps` path ships as `form-contract-auto-form-subject` in `own-tree`, with its extra DOM-attribute count published.

### 2.2 form-contract — zustand store (`equal-tree`)

Identical leaf, `store: createZustandFormStore()`. Present because design §7 item 6 concedes a broadcast-backed adapter cannot reach O(1) notification, costing one `Object.is` per observed key per write. The author's own slower configuration is a subject, for the same reason the competitors' are.

### 2.3 react-hook-form — `register` + per-leaf `useFormState` (`equal-tree`, policy `on-change`)

```ts
// bench/subjects/react-hook-form-scoped-subject.ts
const Leaf = ({ path, label }: LeafProps) => {
  const { register } = useFormContext();
  const { errors } = useFormState({ name: path, exact: true });
  const err = getByPath(errors, path);
  const reg = register(path);
  return h(SharedLeaf, {
    label, name: path,
    defaultValue: DEFAULTS[path],
    ref: reg.ref, onInput: reg.onChange, onBlur: reg.onBlur,
    invalid: Boolean(err), message: err?.message,
  });
};
// useForm({ resolver: zodResolver(SHARED_SCHEMA), defaultValues,
//           mode: "onChange", criteriaMode: "all", shouldUnregister: false })
```

Why each knob: `register` (not `Controller`) because it is RHF's default and its whole architecture; **`useFormState({name, exact})` per leaf** because that is RHF's documented answer to "typing in one field re-renders only what depends on that field" and omitting it would leave RHF as either silent-and-free or correct-and-32-renders — the single most consequential fairness fix the maintainer lens asked for; `criteriaMode: "all"` because the default `firstError` keeps one issue per path while zod returns all, and comparing an issue *list* against a *first-error* library is a data-model artefact, not a disagreement; `shouldUnregister: false` because it is the 7.87 default and it is what makes RHF **pass** the unmounted-field case. The root reads **no** `formState` key — reading `isValid` there silently converts any mode into full-schema-per-keystroke (`_setValid()`), so the verdict reader must never be the thing that causes it (see §4.4).

Variants shipped alongside, each its own row: **`-root-errors`** (one line of `const { errors } = methods.formState` at the root — the 32-component swing most real apps ship); **`-root-isvalid`** (subscribes `isValid` to disable the submit button, publishing the extra `validatorPasses` that subscription causes); **`-on-submit`** (`mode: "onSubmit"`, RHF's shipped default, declared policy `on-submit`); **`-controller`** (`useController` per leaf — the controlled apples-to-apples pairing); **`-deps`** (`register(path, { deps })` — the only wiring that lands a cross-field error before submit, and the second whole-schema pass it costs is attributed to zod in the report, not to RHF).

### 2.4 formik — `useField` + the `validate` prop (`equal-tree`, policy `on-change`)

```ts
// useFormik({ initialValues, validate: nestedZodValidate, validateOnChange: true, validateOnBlur: true })
const Leaf = ({ path, label }: LeafProps) => {
  const [field, meta] = useField<string>(path);
  return h(SharedLeaf, {
    label, name: path,
    value: field.value ?? "", onInput: field.onChange, onBlur: field.onBlur,
    invalid: Boolean(meta.touched && meta.error), message: meta.error,
  });
};
```

`validate`, never `validationSchema`: `prepareDataForValidation` (formik.cjs.development.js:1146-1184) rewrites every `""` to `undefined`, which is right for yup and invents four `expected string, received undefined` errors on a legitimately valid zod root. The `validate` function is harness-owned, calls the shared instance, and returns a `setIn`-shaped **nested** object (a flat dotted map silently shows nothing). Formik declares the capability `one-message-per-path`, so its issue-list channel is compared after `normalize-issue-messages.ts` truncates every subject to the first issue per path.

Variant: **`formik-fast-field-subject`** (`own-tree`) with `validateOnChange: false`, which is Formik's documented answer for large forms. Publishing only the `useField` row would measure Formik with its own performance mechanism switched off.

### 2.5 TanStack Form — form-level Standard Schema (`equal-tree`, policy `on-change`)

```ts
// useForm({ defaultValues, validators: { onChange: SHARED_SCHEMA } })
const Leaf = ({ path, label }: LeafProps) => {
  const field = useField({ form, name: path });   // the hook, not <form.Field>
  return h(SharedLeaf, {
    label, name: path,
    value: field.state.value ?? "",
    onInput: (e) => field.handleChange(e.currentTarget.value),
    onBlur: field.handleBlur,
    invalid: !field.state.meta.isValid,
    message: field.state.meta.errors[0]?.message,
  });
};
```

`mode: "array"` on the items field (without it every cell edit re-renders the list). **Scalar** `form.Subscribe` selectors, never the quickstart's tuple — `useSelector`'s default compare is `===`, so a tuple selector is a free +1 render per keystroke. Recorded as a knob in the report, with the note that the tuple form is what the docs show.

Variant: **`tanstack-field-validators-subject`**, per-field validators, so TanStack's granular path is measured rather than pre-disqualified. Its schemas come from the harness factory `derive-leaf-schema.ts` (built from the shared root at construction and wrapped by the same counter), so it is still the harness's schema and `pathsJudged` reads 1 per call instead of 20.

Charged to TanStack and stated as such: `FormApi.mount()` unconditionally subscribes a throttled devtools observer and emits `CustomEvent`s with a 1 s reconnect interval, with no option to disable it.

### 2.6 The two hand-written references

**`hand-written-root-state-subject`** — one `useState` at the root, controlled inputs, one `safeParse` per settled change. The naive floor.

**`hand-written-per-field-state-subject`** — per-leaf `useState`, `React.memo` on the leaf, a ~60-line `useSyncExternalStore` over a plain `Map` for errors, one `safeParse` per settled change. **This is the denominator.** The design doc's claim is "the store contributes nothing on top of React"; a root-`useState` form re-renders everything, so beating it proves nothing. The claim is reported against this subject only, and never against the naive one.

---

## 3. The shared workload

### 3.1 The schema

`bench/shape/order-schema.ts`, modelled directly on `examples/showcase/src/schema.ts` so the benchmarked form is the form the repo ships: 20 declared scalars across five nested objects (`applicant`, `company`, `billing`, `shipping`, `payment/note/agreed`), `items: [{sku, name, quantity, unitPrice}]`, and three root rules — `agreed !== true` reporting on `["agreed"]`, an empty-items rule on `["items"]`, and one cross-field rule that reports on `["billing","postcode"]` when `sameAsBilling` is toggled off with a divergent shipping postcode. Defaults are **valid**, because a root `superRefine` does not run if any leaf fails; starting from an invalid root measures zod's short-circuit and attributes it to the runtime.

### 3.2 The shapes

| shape | declared | mounted | rows | why |
|---|---|---|---|---|
| `flat-20` | 20 | 20 | 3 | the default rung |
| `flat-60` / `flat-200` / `flat-500` | same | same | 3 | the sweep; 500 because RHF's own advertised regime is 1,000 fields and stopping at 200 is how a benchmark gets dismissed |
| `sectioned-200` | 200 | 200 | 3 | section granularity alone moved fiber visits 207 → 37 at the same render count; both are published |
| `wizard-200-of-20` | 200 | 20 | 0 | the regime where form-contract seeds every cell up front and RHF's `register` is lazy. The schema is shared, so the zod pass is identical and the only difference is mount and fan-out |
| `array-12` | 20 | 20 | 12 | twelve rows, so a splice at index 0 moves eleven |

The typed field is recorded per interaction and swept over `{first, middle, last}` leaf — in `sectioned-200` its depth changes fiber visits directly.

### 3.3 The interactions

| id | step | why it is in the set |
|---|---|---|
| `K1` | type one char, verdict unchanged | the steady state; the `same-issue-list` no-write path |
| `K2` | type one char that introduces an error on the typed field | the write path |
| `K3` | type one char that clears it | the other half |
| `K4` | retype the identical character | the `Object.is` bailout. Published in the self-audit tier only, not as a cross-library row — it is a store-contract conformance case, not a user interaction |
| `K5` | burst of five characters, one settle at the end | the workload every library's coalescing and debouncing exists for. Drain-per-keystroke is the one arrangement in which those mechanisms buy nothing |
| `B1` | blur a touched-but-empty field | without it, RHF `onTouched`/`onBlur`, Formik's `validateOnBlur` default and TanStack `onBlur` validators are all unreachable, and the DOM channel forces eager error display on libraries whose idiom is `touched && error` |
| `X1` | toggle `sameAsBilling` so the rule reports on `billing.postcode` | the cross-field claim, started from an otherwise-valid root |
| `A1` | append a row | |
| `A2` | remove row at index 0 | the README states the cost outright: "splicing at index 0 re-subscribes every following row". At 12 rows this moves eleven |
| `A3` | remove a row from the middle | the cheaper index, published beside `A2` so the difference is visible |
| `A4` | insert at index 0 | mints a row id and grows the array; worse than `A2` |
| `S1` | submit an empty form | the heaviest real interaction there is, and form-contract's per-path scatter worst case: N issue writes, N notifications, one commit. Absent from all three candidate designs |
| `U1` | hide a subtree holding a rejected value, then submit | |
| `U2` | unmount then remount a field holding an error; read its **first** render | design §8 test 4; the one capability TanStack fails |
| `R1` | `reset()` | |
| `M1` / `M2` | mount `flat-N` / mount `wizard-200-of-20` | |
| `C1` | composition: `compositionstart` → `input` → `compositionend` | browser lane only; capability channel only, not timed. §7 rejects a narrowed `onChange` on exactly this ground |
| `P1` | caret position after a keystroke mid-string (`selectionStart`) | browser lane, capability channel. Only the controlled architectures can fail it |

---

## 4. The agreement gate

### 4.1 The oracle is a policy, and the policy is an axis

`oracle-verdict.ts` applies the scenario's edits to a `structuredClone` of the defaults with a plain reducer (no React, no form library) and asks the shared schema what it thinks. That is **not** neutral ground truth: "the whole root, judged on every settled change, every issue on its own path, no touched-gating" is a sentence-for-sentence description of form-contract's own runtime. So the oracle is parameterised by `policy.ts`:

- `on-change` — a verdict is claimed after every settled change
- `on-blur` — after blur, and after the first submit
- `on-submit` — at submit only

Each subject **declares** its policy. Agreement is scored *within* the declared policy. The matrix has five cell values, not three:

`agrees` · `agrees at submit only` · `by design (documented: <citation>)` · `not applicable (capability: <citation>)` · `disagrees`

RHF's `mode: "onSubmit"` default prints `by design (documented)` with a link to the RHF option table, **not** `disagrees`. Section 1 of the report is labelled a **policy-conformance matrix**, not an oracle of correctness, and the first sentence under its heading says that the on-change policy is form-contract's only policy and that three of the four competitors ship a different default.

### 4.2 Channels

Three, read from the rendered DOM only, never through a library API:

1. **values** — `input.value` for every declared path
2. **issues** — the rendered message text keyed by path, plus `aria-invalid`. Gated on the **set of paths**; message strings are compared after `normalize-issue-messages.ts` truncates every subject to the first issue per path, and full strings are printed verbatim (capped at 200 chars) in the disagreement section
3. **submit** — `submitBlocked`, `blockingPaths`, `submittedRoot`, obtained by *attempting a submit* at designated, untimed observation points

### 4.3 What happens to a library that cannot do a case

Three separate dispositions, and none of them is free:

- **`not applicable`** is decided *before* the scenario runs, from the capability the scenario `requires` and the capabilities the subject declares, with a reason written by the adapter author in code. Every subject must contribute at least one capability to the vocabulary (this is asserted), so form-contract's column has greys in it too: `validateOn` / `mode` is a capability all four competitors have and it does not.
- **`by design`** carries a citation to the library's own documentation and a **repair row**: where a supported configuration exists (`register(name,{deps})`, `onChangeListenTo`, Formik's `validate` prop), the repaired configuration is measured and its price published in the same table. "It cannot do this" and "it can, and here is what it costs" are different sentences.
- **`disagrees`** publishes both strings side by side. Its counts stay visible and struck through, and **it stays in the losses list**. Disagreeing rows are excluded only from ratio sentences in the timing section — never from the losses list, because the cheapest competitor configurations are exactly the ones that disagree, and removing them from the loss list by a fairness rule would be the rig.

### 4.4 The six proofs, in the order a sceptic attacks them

1. **The shared instance was reached** — not `=== SHARED_SCHEMA`, which is unsatisfiable once the instance is wrapped and forbids every legitimate adapter shim. `assert-shared-schema-was-reached.ts` requires the harness's own counter to have advanced during the interaction. This unblocks Formik's `validationSchema` path via a shim and TanStack's derived leaf schemas.
2. **The root handed to the validator matches** — `assert-validated-root-matches.ts` deep-equals the object the subject passed the validator against the root the harness's reducer built. RHF clones `_formValues`, Formik holds its own `values`, TanStack its own store, so reference equality could never hold; deep equality catches `prepareDataForValidation` and any other value-transforming wrapper as a failed assertion rather than as four phantom errors and a fast, broken competitor.
3. **The oracle is not vacuous** — per scenario the oracle must reject something, and the rejected set must *move* between two observation points. Cross-field scenarios additionally assert zero issues at the point before the edit (zod's short-circuit) and that the issue lands on a path the script did not write.
4. **The subject is live** — `assert-subject-is-live.ts` requires, for one programmatic write through the library's own API, that **the DOM changed OR a commit occurred** (not AND: RHF's `setValue` on a registered text input writes `ref.value` directly and emits no state, so an AND rule would exclude four of five RHF subjects — its flagship configuration), **plus** that a subsequent read through the library's own getter returns the written value. This is the React descendant of `assertReferenceIsNotEliminated`: a subscription that was never installed renders correctly, counts zero and looks superb. It re-mounts the subject afterwards, so the canary's dirty/touched/submitCount residue does not enter any scenario.
5. **The DOM is the same** — `assert-dom-shape-matches.ts` hashes each `equal-tree` subject's normalised `outerHTML` (attribute order sorted, whitespace collapsed, and `value`/`defaultValue`/`checked`/`aria-invalid`/`data-*` removed, because those are observable state and are compared by channel 1 and 2 instead). A mismatch aborts and prints the first differing node.
6. **The tree is the same** — `assert-tree-fibers-match.ts`, within the `equal-tree` class, per shape.

Only after all six pass is anything written to the baseline.

---

## 5. Every metric

### Tier 1 — cross-library counts. Deterministic, harness-owned, **gated**.

| metric | means | does NOT mean |
|---|---|---|
| `commits` | times React committed for this interaction, from `onCommitFiberRoot`, **filtered by fiber root** (two subjects are mounted in one document during an interleaved pair; an unfiltered hook puts the idle partner's commits in the active subject's exact-gated column) | not work, not time. A commit that touched one text node and one that rebuilt 200 inputs both read 1 |
| `fiberVisits` | fibers cloned into the committed tree, **diffed per commit against its immediate predecessor**. The naive first-vs-last diff reads 0 whenever a step produces an even number of commits (React double-buffers alternates): measured 0 against a true 56 on exactly the case form-contract is slowest at | a total. It is a **floor** — a render React discarded leaves no trace, and the architecture that discards renders is form-contract's own (§7 item 5). Exact only under SyncLane, which holds for form-contract and TanStack (`useSyncExternalStore` → hard-coded lane 2) and degrades to a floor for RHF and Formik, which commit from a promise continuation on DefaultLane |
| `rerendered` | of those, how many ran their function, inferred from `memoizedProps`/`memoizedState` identity against the alternate | also a floor: a component React invoked whose props and state are both referentially unchanged classifies as bailed. And it is not a cost — Formik's `FastField` shows N trivial `connect` wrapper renders at full weight against form-contract's 2 |
| `bailedClones` | `fiberVisits − rerendered` | — |
| `domMutations` | `MutationObserver` records on the subject's host subtree | not layout. jsdom charges nothing for the consequence |
| `treeFibers` | committed tree size, per subject per shape | — |
| `validatorPasses` | calls into the shared schema per interaction | **not work.** 1 at N=20 and 1 at N=500 |
| `pathsJudged` | leaf paths the call could reject, summed over calls | the metric that makes granularity a wash: TanStack field-level reads 20 passes × 1 path against form-contract's 1 × 20 |
| `mountCommits` / `mountFiberVisits` | the same, for `M1`/`M2` | — |

`componentBodyInvocations` is **not published at all**, in either tier. Printing a number beside a note saying it is not comparable is how the number gets compared. The refusal is stated in the report, with the measured demonstration behind it: a counter on the obvious per-field wrapper reported **0 renders for a keystroke that visibly changed the DOM**, because the subscription lives one component below.

### Tier 2 — self-audit. form-contract only, **gated**, no competitor column.

Obtained from `counting-cell-store.ts`, a `FormCellStore` decorator that satisfies the contract and counts. These exist because the largest attack on the winning design was that its metric set was structurally blind to the library's own per-keystroke work.

| metric | what it tests |
|---|---|
| `storeWrites`, `storeReads`, `notificationsDelivered` | design §3's "Work is O(cells that changed), not O(mounted fields)" |
| `openCellScanLength` | `refresh-open-cells.ts` calls `openCells.forEachOpen` on **every** write, and `open-value-cells.ts` implements it as `Array.from(readerCounts.keys())` plus an `isAncestorPath` per entry. At `flat-200` that is a 200-element allocation and 200 comparisons per character, producing zero commits, zero fiber visits and zero validator passes. **This is the number Tier 1 cannot see, and it is gated** |
| `issueObjectsAllocated` | `distribute-issues.ts` per pass |
| `cellsSeededAtMount` | `write-declared-cells.ts` writes one `valueCell` per expanded declared path inside `createForm`, so this is O(N) and never 0. The README's "mounting is a subscription and nothing else" is about the React mount commit, which is trivially 0 by construction; both numbers are published with that distinction spelled out, because the ambiguity lets the weak measurement be read as the strong claim |

Stated in the report: this tier gates the author's library against the author's own design document and carries no competitor column, because the competitors expose no equivalent. It is a self-audit, not a comparison.

### Tier 3 — printed, hedged, not counts.

`bytesPerInteraction` (heapUsed delta over 500 drained interactions under `--expose-gc`, three repeats with spread), `retainedHeapAfterMount` per field (the cross-library mount-cost metric), `bundleBytes` (each subject's entry built through one vite config, gzipped, minus a React-only baseline entry — a rough attribution, labelled as one). RHF is the ~9 kB zero-dependency incumbent and form-contract ships one package with six entry points; a benchmark that counts nine kinds of render work and no bytes leaves a reader assuming bytes were checked.

### Tier 4 — time. Browser lane only. **Printed, never gated.**

`inputHandlerMicroseconds` — the `EventDispatch` trace event **filtered to `args.data.type === "input"`**. The filter is load-bearing: measured per-keystroke medians by type on a 200-input page are keypress 650 µs, textInput 617 µs, input 77 µs, keydown 24, keyup 12, beforeinput 2. A median over all `EventDispatch` events made a 200,000-iteration injected busy loop *completely invisible*. The filter is printed next to the number.

Also `validatorMicroseconds` (from the same wrapper as `validatorPasses`), `runtimeMicroseconds` (= input handler − validator, explicitly labelled as a subtraction), `layoutMicroseconds` + `LayoutCount`, `UpdateLayoutTree` + `RecalcStyleCount`, `Paint`/`PrePaint`/`Commit`, `EventLatency` (median **and** p90, never a bare median), frame-budget overrun share at 60 and 120 Hz, `JSEventListeners` at mount.

**Measured and deliberately excluded, each with its reason printed in an excluded-metrics block:** `ScriptDuration` (245% pair-ratio spread between two byte-identical pages); `TaskDuration` (2.94 ms/keystroke against 26 µs of script — it measures the driver's CDP round trip); `PerformanceEventTiming.duration` (quantised to 8 ms); `Profiler.actualDuration` (6× smaller than wall clock, excludes commit, and fires **zero times** in the production client build); **all jsdom milliseconds** (no layout, no style resolution, no paint, no compositor — measured 216-272 µs of layout against 26 µs of script per keystroke on a 200-input page; publishing the 26 as "the cost of typing" reports 9% of the main-thread work and none of the part the user sees).

---

## 6. Sampling and reporting discipline

### 6.1 Counts lane

Production React, asserted three ways: `NODE_ENV === "production"` set before any dynamic import of react-dom; `React.act === undefined`; and a throwaway root wrapped in `<Profiler onRender>` that must fire **zero** times — the last is the only one of the three that proves *react-dom* is the production build rather than *react*. `assert-strict-mode-absent.ts` runs beside them; StrictMode is an exact 2× on every counter with no code change.

Every count is taken **three times**. `stability-screen.ts` promotes an integer to the gated tier only if all three reads are identical; anything else is demoted to the printed tier automatically, in the recorder, not by hand. (Measured precedent: `RecalcStyleCount` read 2 per 40 keystrokes in one probe and 0 in another.)

`settle.ts` runs `await null; await null; await new Promise(r => setTimeout(r, 0))` between interactions and before every verdict read. In a tight synchronous loop the microtask queue never drains, `schedule-validation.ts` never fires, and form-contract's whole-root pass vanishes entirely — measured elsewhere at **0 adapter calls in 400 keystrokes**, a 1.62× flattery on work not done. `validatorPasses` is the cross-check: 0 for a subject declared `on-change` fails the run.

**How a count earns the right to be called real:** a difference of ≥1 reproduced identically on all three repeats. There is no threshold to justify.

### 6.2 Time lane

Headless Chrome via `playwright-core` (no browser download; `--browser=chrome` drives the locally installed one). One origin and one renderer process per subject, COOP/COEP set and `crossOriginIsolated` asserted, with the measured `performance.now()` tick recorded in the baseline (5 µs isolated, 100 µs not). Numbers come from the trace, never from page JS.

- warm-up 250 ms per subject; the shared schema is warmed by the **oracle** before any subject's warm-up, and the warm order is published, so no subject rides free on another's lazy zod initialisation
- **21 interleaved pairs**, alternating order `A,B` on even pairs and `B,A` on odd. Interleaving is not optional: two byte-identical pages measured as sequential halves reported **0.8891** — an 11% difference between a page and its own copy — while interleaved they read 0.9956/0.9897/1.0040. The alternation closes luq's own open crack, where `first` always precedes `second` and A's cache and allocator residue enters B's sample every time.
- the statistic is `median(perPairRatios)`, never the ratio of two medians, with the full range beside it and `relativeSpreadPercent` carrying luq's warning that it is an upper bound on disturbance and not a confidence interval
- interactions are dispatched as one batched CDP sequence per interaction, then a macrotask and a presented frame. Awaiting each key press individually makes over 99% of the measurement the driver
- a `PerformanceObserver` on `entryTypes:["gc"]` attributes GC milliseconds per sample and publishes them as a column. Samples are never dropped; a 4.2 ms pause against a 48 ms sample is 9% and the reader is entitled to see it

**Resolution, published above the results.** `measure-null-band.ts` runs **a null twin per subject per size rung**, interleaved through the run rather than once at the start (variance scales with work, so calibrating every verdict on form-contract's self-pair would declare Formik rows "resolved" inside their own noise). Null and comparison pair counts are pinned equal and reported as quantiles, not min-max, because a min-max band widens with N and would otherwise make the sample count the cheapest knob in the design.

`measure-calibration-ladder.ts` injects a known cost of 0 / 0.1 / 0.25 / 0.5 / 1 / 2 / 4 ms at **three scheduling positions** — synchronous in the handler, `Promise.resolve().then`, `setTimeout(0)` — because form-contract defers its pass to a microtask and the headline metric is `EventDispatch` filtered to `input`; a synchronous-only ladder proves resolution for the one cost shape the harness already sees best.

**How a time difference earns the right to be called real:** its pair-ratio band must (a) not overlap the null band for that subject pair at that size rung, and (b) exceed the smallest ladder rung resolved at that scheduling position. Otherwise `summarise-samples.ts` returns `indistinguishable`, and the report prints that word. A harness whose resolution is published cannot round 6% up into a win.

### 6.3 Machine and provenance

`describe-machine.ts` copied from luq unchanged (cpu model, cores, platform, arch, node version, total memory — captured automatically instead of asking a human to remember). `describe-react-environment.ts` records react / react-dom / jsdom / zod versions and the three production assertions. `describe-browser.ts` records the Chrome build string, CDP protocol version, headless flag, device scale, refresh rate and any CPU throttle. `read-installed-version.ts` copied from luq: read `node_modules/<pkg>/package.json` off disk, not `require(pkg + "/package.json")`, because not every package lists `./package.json` in its exports and branching on that leaves exactly the unreadable ones unknown.

---

## 7. File layout

Every file kebab-case, one responsibility, under 200 lines, `.ts` only.

```
bench/
  run-forms-bench.ts            entry; --record | --gate | --print | --calibrate | --recalibrate
  lane-counts.ts                orchestrates the jsdom lane
  lane-time.ts                  orchestrates the browser lane
  tsconfig.json

bench/env/
  set-production-env.ts         sets NODE_ENV before any dynamic import of react-dom
  assert-production-react.ts    act undefined + Profiler fires zero + NODE_ENV
  assert-strict-mode-absent.ts
  jsdom-environment.ts
  describe-machine.ts           copied from luq, unchanged
  describe-react-environment.ts
  read-installed-version.ts     copied from luq, unchanged

bench/shape/
  order-schema.ts               THE schema instance
  order-defaults.ts             valid defaults
  declared-paths.ts             derived once
  issue-path-to-concrete-path.ts   ["items",0,"sku"] -> items[0].sku, in one place
  scale-shape.ts                20 / 60 / 200 / 500
  sectioned-shape.ts
  wizard-shape.ts               200 declared, 20 mounted
  array-shape.ts                12 rows
  shared-leaf.ts                the one leaf every equal-tree subject renders
  shared-skeleton.ts            sections, row container, submit bar
  derive-leaf-schema.ts         harness-owned per-field schema factory
  count-validator-work.ts       passes + pathsJudged + nanoseconds

bench/subjects/
  subject.types.ts              FormSubject, Capability, Policy, TreeClass
  subject-registry.ts           SUBJECTS + SUBJECTS_OUTSIDE_THE_GATE (in code, never in JSON)
  form-contract-use-field-subject.ts
  form-contract-field-component-subject.ts
  form-contract-zustand-subject.ts
  form-contract-auto-form-subject.ts
  react-hook-form-scoped-subject.ts
  react-hook-form-root-errors-subject.ts
  react-hook-form-root-isvalid-subject.ts
  react-hook-form-on-submit-subject.ts
  react-hook-form-controller-subject.ts
  react-hook-form-deps-subject.ts
  formik-use-field-subject.ts
  formik-fast-field-subject.ts
  formik-nested-zod-validate.ts     the setIn-shaped validate function
  tanstack-schema-subject.ts
  tanstack-field-validators-subject.ts
  hand-written-root-state-subject.ts
  hand-written-per-field-state-subject.ts
  null-twin-subject.ts
  calibration-subject.ts            the injected-cost ladder, three positions

bench/agreement/
  verdict.types.ts
  policy.ts                     on-change | on-blur | on-submit
  apply-script.ts               the reducer; no React, no library
  oracle-verdict.ts
  read-observable-state.ts      DOM only
  normalize-issue-messages.ts   first issue per path
  compare-verdicts.ts           path + both strings, never a score
  scenario.types.ts
  scenarios/                    one file per interaction in 3.3, plus index.ts
  measure-scenario-agreement.ts
  assert-oracle-is-not-vacuous.ts
  assert-scenarios-cover-conceded-limits.ts
  assert-shared-schema-was-reached.ts
  assert-validated-root-matches.ts
  assert-subject-is-live.ts
  assert-dom-shape-matches.ts
  assert-tree-fibers-match.ts
  assert-every-subject-contributes-a-capability.ts

bench/react-work/
  install-devtools-hook.ts      before react-dom is imported
  attribute-commit-to-root.ts   two mounted roots, one hook
  snapshot-committed-fibers.ts
  count-fiber-visits.ts         per-commit delta; carries the 0-vs-56 war story
  classify-fiber-visit.ts       rerendered vs bailed, by alternate identity
  count-dom-mutations.ts
  drive-input.ts                native setter + bubbling input event; no act()
  drive-blur.ts
  drive-submit.ts
  settle.ts
  observe-gc.ts
  measure-allocation.ts

bench/self-audit/
  self-audit.types.ts
  counting-cell-store.ts        FormCellStore decorator
  count-open-cell-scan.ts
  assert-design-claims.ts       §3's O(cells that changed) against openCellScanLength

bench/time/
  vite.config.ts                builds the same .ts subjects for the browser
  launch-chrome.ts
  describe-browser.ts
  serve-subjects.ts             COOP/COEP
  open-subject-page.ts
  collect-trace.ts
  trace-durations.ts            holds the args.data.type filter + the per-type median table
  read-performance-metrics.ts   marks excluded metrics at the type level
  dispatch-interaction.ts       batched, no per-keystroke await
  take-interleaved-pairs.ts     A,B / B,A; header carries the 0.8891 result
  summarise-samples.ts          faster | slower | indistinguishable
  measure-null-band.ts          per subject, per rung, interleaved
  measure-calibration-ladder.ts

bench/report/
  form-baseline.types.ts
  read-form-baseline.ts         throws rather than defaulting; strips a BOM
  record-form-baseline.ts       sticky ceilings; --recalibrate is the only mover
  check-form-baseline.ts        the gate
  stability-screen.ts
  loss-row-identity.ts
  order-losses-first.ts
  capability-matrix.ts
  measure-gate-resolution.ts    runnable, not a frozen constant
  replace-block.ts              throws on a missing marker
  render-markdown-tables.ts
  write-form-report.ts

config/form-baseline.json, config/form-baseline.ci.json
docs/measurements-forms.md
.github/workflows/forms-counts.yml, forms-time.yml
```

---

## 8. The report

`npm run bench:forms --record` writes the baseline, regenerates the marker-fenced tables in `docs/measurements-forms.md`, and prints the same to stdout. **Numbers are generated; interpretation is hand-written beside them.** `replace-block.ts` throws on a missing marker, because deleting a marker would otherwise be the easiest way to disable the check — and every sentence containing a count goes inside a fence, including "N pairings are gated", which is the exact sentence sitting outside a fence in luq today saying fifteen where the baseline holds twelve.

**§0 — What this harness can see.** Before any comparison: the null band per subject per rung, the calibration ladder as injected-ms × scheduling-position × resolved/not, and one generated sentence — *"this harness sees a 0.1 ms per-keystroke difference at the synchronous position, 0.25 ms at the microtask position, and exactly one extra commit."* Generated by `measure-gate-resolution.ts`, inside a fence, so it cannot drift into being wrong while still being quoted.

**§1 — Where form-contract is not first.** Produced by `order-losses-first.ts` by sorting every table by form-contract's rank and emitting every row where it is beaten, **sorted by magnitude within rank** so "beaten by one fiber visit" and "beaten 1000× on bytes" do not sit undifferentiated. Disagreeing rows are in this list, annotated. Each row carries its **mechanism**, not just its number.

**§2 — What was run.** Machine, react/react-dom/jsdom/zod, each competitor version read from disk, the three production assertions, and per subject: `policy`, `configuration` literal, `writtenFrom` documentation URL, `treeClass`, and the reviewer line (§9).

**§3 — Policy-conformance matrix.** Scenario × subject, five cell values, with the standing sentence that the on-change policy is form-contract's own and three of four competitors ship a different default. Capabilities are listed per subject, both directions.

**§4 — Disagreement detail.** Every mismatch in full: scenario, observation point, channel, path, both strings verbatim. Not summarised to a count.

**§5 — Counts.** Tier 1, per interaction per subject, with `validatorPasses` and `pathsJudged` on the same row so a 0-commit row can never be read as free, and `Δfibers` on every `own-tree` row.

**§6 — Self-audit.** Tier 2, form-contract only, with the no-competitor-column note.

**§7 — Time.** Browser lane only. `inputHandlerMicroseconds` / `validatorMicroseconds` / `runtimeMicroseconds` / layout / paint / EventLatency median + p90 / overrun share, then the pair-ratio band against `hand-written-per-field-state` with a `verdict` column reading faster / slower / **indistinguishable**. Absolute microseconds are published beside the ratios (luq records absolutes; dropping them removes the one number a reader can hold against a 16 ms frame budget). The crossover field count is reported as a **bracket between adjacent sweep points**, never as a point estimate, because it is a sign change in the difference of two large numbers.

**§8 — Size and shape sweep.** §5 and §7 at 20/60/200/500, flat and sectioned, plus the wizard shape.

**§9 — Excluded metrics**, each with the measurement that excluded it.

**§10 — What this cannot measure**, generated from the same JSON as §9 of this spec so it cannot be quietly trimmed.

Stdout mirrors this, with `MACHINE WAS NOISY` inline per figure that never got under the spread limit after retrying — labelled, not laundered.

### CI

`forms-counts.yml`, **no path filter** (luq's rule: "I did not touch code, so this is safe" is designed not to hold, and `package-lock.json` is where competitor versions move). Fails on: any policy-conformance cell changing; any disagreement whose **identity** changed, not merely its count; any Tier 1 or Tier 2 integer differing by one; any **loss row identity** disappearing from the set; the six proofs; zero matched rows. **Competitor count drift also fails**, with a re-record instruction rather than a threshold — determinism is the argument for this lane, so a deterministic metric that never gates for competitors is a table that can only go stale in one direction. It prints, unconditionally: *"Timings do not fail this check: they move when the runner does, which is the same reason the baselines are per environment."*

`forms-time.yml` records `config/form-baseline.ci.json` and uploads `form-baseline-${{ github.run_id }}`. CI never commits to `config/`. Ceilings are sticky; `--recalibrate` is the only mover and is always a reviewed diff, because otherwise the response to a regression is to re-run the recorder and a command that looks like housekeeping converts the gate into a rubber stamp. `--record` writing the loss-row identity set is guarded by the same flag, so re-recording after a change cannot silently re-baseline the loss floor.

---

## 9. What this benchmark cannot measure — for the report itself

1. **Uncontrolled and controlled are different architectures, not the same architecture at different speeds.** RHF's `register` re-renders zero times for a valid keystroke. That is not cheap re-rendering, it is no re-rendering, and no metric makes it the same job as form-contract's. The table puts them side by side and says so; it cannot make the comparison fair. **This cannot be closed.**
2. **The author wrote every adapter.** `writtenFrom` cites the documentation page each idiom came from and both ends of every dial are published, which bounds the choice; it does not remove the asymmetry. Mitigation, not fix: every subject file is offered as a PR to the library's maintainers before publication, and the report names, per subject, which maintainers reviewed it and which declined. **This cannot be closed by any mechanism inside the harness.**
3. **`fiberVisits` and `rerendered` are floors.** Discarded renders leave no trace in any committed tree; reaching the true count needs `performUnitOfWork`, which is module-private. Exact under SyncLane, which holds for form-contract and TanStack and degrades to a floor for RHF and Formik.
4. **Determinism is not accuracy.** Three identical hashes prove the harness is reproducible, not that commit attribution across the DefaultLane subjects is right.
5. **Commit scheduler priority.** The production react-dom build passes `priority` as `undefined` to `onCommitFiberRoot`, so the column that would prove every subject commits on the same lane is only available from a dev-build pass — a 6.6× slower world that taxes subscription-per-cell designs (form-contract 5 `useSyncExternalStore` per field, TanStack 7, RHF 0) relative to ref-and-Subject ones. That pass is run and labelled, and its numbers are never read across to the timing columns.
6. **The validator is held constant by excluding every non-zod configuration.** Formik-with-yup, RHF-with-yup and anything ajv-backed are out of scope by construction. Those are real configurations people ship.
7. **One browser engine, headless, synthetic input.** Chromium only. A headless run's presentation timings come from a synthetic frame sink; `EventLatency`'s first stage begins at a timestamp the harness caused, so the true beginning of the user's wait is missing and the absolute figure is optimistic for everyone, equally.
8. **Async validation, SSR/hydration and server-error round trips.** Out of scope in v1. The pass-id machinery, `isValidating` and drop-the-stale-answer are neither credited nor charged.
9. **A per-component render count that means the same thing in five libraries.** Not an instrumentation problem — the quantity does not exist, because "a component" is not a library-independent unit. The harness refuses to print one, and a reader who came for that number will read the refusal as evasion. That cost is accepted rather than paid off with a number that means five different things.
10. **The scenario set is the author's.** `assert-scenarios-cover-conceded-limits.ts` ties it to design §7's six "what cannot be fixed" items, so the losses derive from the design's own admissions — but a limit the design never conceded is a scenario nobody thought to write, and the §7-item-to-scenario mapping is written by the same person who wrote §7.

---

## 10. The first runnable slice

The smallest thing that produces a trustworthy number for **two** subjects and no more.

**Subjects:** `form-contract-use-field-subject` and `hand-written-per-field-state-subject`. Two, because the design doc's claim — "the store contributes nothing on top of React" — is a claim about exactly this pair, and it is falsifiable with no competitor involved.

**Shape:** `flat-20` only.

**Interactions:** `K1`, `K2`, `X1`.

**Lane:** counts only. No browser, no timing, no CI, no ratios.

**Ships:**

```
bench/run-forms-bench.ts (print only)
bench/env/{set-production-env, assert-production-react, assert-strict-mode-absent,
           jsdom-environment, describe-machine, describe-react-environment,
           read-installed-version}.ts
bench/shape/{order-schema, order-defaults, declared-paths,
             issue-path-to-concrete-path, shared-leaf, shared-skeleton,
             count-validator-work}.ts
bench/subjects/{subject.types, subject-registry,
                form-contract-use-field-subject,
                hand-written-per-field-state-subject}.ts
bench/agreement/{verdict.types, policy, apply-script, oracle-verdict,
                 read-observable-state, normalize-issue-messages, compare-verdicts,
                 scenario.types, scenarios/{k1,k2,x1,index},
                 measure-scenario-agreement,
                 assert-oracle-is-not-vacuous, assert-shared-schema-was-reached,
                 assert-validated-root-matches, assert-subject-is-live,
                 assert-dom-shape-matches, assert-tree-fibers-match}.ts
bench/react-work/{install-devtools-hook, attribute-commit-to-root,
                  snapshot-committed-fibers, count-fiber-visits,
                  classify-fiber-visit, count-dom-mutations,
                  drive-input, settle}.ts
bench/self-audit/{self-audit.types, counting-cell-store, count-open-cell-scan}.ts
bench/report/{stability-screen, order-losses-first, render-markdown-tables}.ts
```

**Acceptance, all six of which must hold before a single number is printed:**

1. `assert-production-react` passes all three checks, including the zero-firing `<Profiler>`.
2. `assert-dom-shape-matches` and `assert-tree-fibers-match` pass for the pair.
3. `assert-subject-is-live` passes for both under the OR rule.
4. `assert-validated-root-matches` deep-equals both subjects' validated roots against the reducer's.
5. `assert-oracle-is-not-vacuous` passes for all three scenarios, and `X1` starts from a zero-issue root.
6. All Tier 1 and Tier 2 integers read identically on three consecutive runs.

**The one table it prints** — losses first, `validatorPasses` and `pathsJudged` on every row, `openCellScanLength` in a fenced self-audit block below, and a standing line saying no milliseconds are published from jsdom.

Everything else is ordered behind it: **slice 2** adds the policy axis and `react-hook-form-scoped-subject` plus `-on-submit` (the first subject whose declared policy differs, and therefore the first real test of the matrix's five cell values); **slice 3** adds the remaining subjects, the shape sweep and the CI counts gate; **slice 4** adds the browser time lane with the null band and the three-position calibration ladder, which is the first slice permitted to publish a millisecond.

---

## Appendix A — every attack, and its disposition

| # | Attack | Disposition |
|---|---|---|
| A1 | The oracle is form-contract's validation policy restated as ground truth | **Closed.** Policy is an explicit axis; five cell values including `by design (documented)`; §3 relabelled a policy-conformance matrix; the standing sentence names the on-change policy as form-contract's own |
| A2 | RHF's comparable per-field subscription (`useFormState({name,exact})`) omitted | **Closed.** It is now RHF's primary row |
| A3 | "RHF at onSubmit reads 0 validatorCalls" is an artefact of the verdict reader reading `isValid` | **Closed.** `submitBlocked` is read by attempting a submit at untimed observation points; the isValid-at-root configuration is a separate published row with its extra passes shown |
| A4 | `criteriaMode` / one-message-per-path is a data-model artefact scored as disagreement | **Closed.** `criteriaMode: "all"`; paths gated, messages normalised to the first per path; `one-message-per-path` is a declared capability |
| A5 | No blur anywhere | **Closed.** `B1` added; `validateOnBlur` defaults kept |
| A6 | `revalidateLogic` misread; `onChangeListenTo` is the TanStack cross-field repair | **Closed.** Corrected in the subject file and the repair row |
| A7 | `validatorCalls` counts calls, not work; penalises granularity | **Closed.** `pathsJudged` + `validatorMicroseconds` |
| A8 | `assert-one-schema` is self-contradictory and unsatisfiable | **Closed.** Replaced by reached-the-shared-instance (counter) + deep-equal validated root |
| A9 | Two mounted roots, one devtools hook | **Closed.** `attribute-commit-to-root.ts` |
| A10 | `assert-same-tree-shape` narrower than sold; `treeFibers` spread only a warning | **Closed.** Normalised outerHTML hash + `treeFibers` equality **asserted** within `equal-tree`; `own-tree` publishes `Δfibers` |
| A11 | `shouldUnregister:true` is a non-default footgun | **Closed.** Default `false`; RHF **passes** `U1` and the report says so |
| A12 | The gate covers only the axis form-contract optimises | **Closed by Tier 2 + Tier 3.** `openCellScanLength` is gated; bytes, retained heap and bundle size are published |
| A13 | Single size; competitors only at 20 | **Closed.** Every subject runs the full sweep to 500 |
| A14 | Warm-up order and the settle boundary | **Closed.** Oracle warms the schema first, order published; settle is outside the timed region and an empty-settle floor is published per subject |
| A15 | Prose mechanism claims untested, and one (RHF `startsWith`) already wrong at 7.87 | **Closed.** Every mechanism sentence beside a number carries `file:line` at the pinned version, and the RHF claim is corrected |
| A16 | Liveness canary near-vacuous and leaves residue | **Closed.** OR rule + library-getter read-back + remount afterwards |
| A17 | The ms ratio cancels the whole-root zod pass | **Closed.** `validatorMicroseconds` and `runtimeMicroseconds` published separately; crossover reported as a bracket |
| A18 | `refresh-open-cells`'s O(mounted fields) scan invisible to every metric, contradicting design §3 | **Closed.** `openCellScanLength` is a gated Tier 2 integer with `assert-design-claims.ts` behind it |
| A19 | `assert-scenarios-cover-conceded-limits` unsatisfiable; §7 items 2, 4, 5, 6 uncovered; no zustand subject | **Closed.** zustand and `<Field>` subjects added (items 6 and 4); item 2 and item 5 are named in §9 as regimes the harness does not enter, and the assert requires either a scenario **or** an explicit §9 entry per item |
| A20 | Memory, bundle, retention unmeasured | **Closed.** Tier 3 |
| A21 | The promised declared≫mounted shape had no file | **Closed.** `wizard-shape.ts` |
| A22 | The splice scenario picks the cheap index | **Closed.** `A2` (index 0), `A3` (middle) and `A4` (insert at 0), at 12 rows |
| A23 | No many-fields-invalid-at-once scenario | **Closed.** `S1` |
| A24 | Capability vocabulary drawn only from form-contract's feature list | **Closed.** Every subject must contribute a capability (asserted); `validateOn`/`mode` is a capability form-contract lacks |
| A25 | Both ends of the dial for everyone except the author | **Closed.** Four form-contract configurations |
| A26 | The hand-written denominator is a strawman | **Closed.** Two hand-written subjects; the store claim is scored only against the memoised per-field one |
| A27 | `lossRowCount` gates on a count | **Closed.** Gated on row identity |
| A28 | `componentBodyInvocations` printed with "do not compare this" beside it | **Closed.** Not printed at all, and the refusal is explained with the 0-vs-1 measurement |
| A29 | `storeWritesAtMount` self-contradictory and single-subject | **Closed.** `cellsSeededAtMount` (O(N), in Tier 2, self-audit) and `retainedHeapAfterMount` (Tier 3, cross-library) |
| A30 | `--recalibrate` is one flag in a single-author repo | **Partially closed.** Exclusions live in code, the flag is required for both ceilings and the loss set, and CI never commits to `config/`. A single-author repository cannot manufacture a second reviewer; stated |
| A31 | No burst typing; drain-per-keystroke defeats coalescing | **Closed.** `K5` |
| A32 | `.tsx` does not type-strip under Node | **Closed.** No JSX anywhere |
| A33 | `React.act === undefined` checks the wrong package | **Closed.** Zero-firing `<Profiler>` proves react-dom |
| A34 | jsdom milliseconds quoted as latency | **Closed.** jsdom publishes no milliseconds; all time comes from the Chrome trace |
| A35 | Null band and ladder calibrated on one subject, one size, one scheduling position | **Closed.** Per subject, per rung, interleaved, three positions, quantile bands, pinned equal N |
| A36 | Competitor rows never gate | **Closed.** Any competitor count drift fails, with a re-record instruction |
| A37 | IME and caret preservation absent | **Closed as capability channels** (`C1`, `P1`, browser lane); not timed, and stated |
| A38 | `EventDispatch` median over all event types hides injected work | **Closed.** Filtered to `type === "input"`, filter printed beside the number, with the per-type median table in the file header |
| A39 | Uncontrolled vs controlled is not the same job | **Cannot be closed.** §9 item 1 |
| A40 | The author wrote every adapter | **Cannot be closed.** §9 item 2, mitigated by `writtenFrom` plus a named maintainer-review line per subject |