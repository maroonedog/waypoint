# Focused pilot and next decisions

This records work order, not a claim of public release or production adoption.

## 1. Composition

Implemented: package-boundary regression coverage, adapter type identity, and
application-owned registration guidance in `registry-composition.md`.
Remaining: multiple installed versions and declaration bundling. Do not promise
namespace isolation or immunity to dependency augmentation.

## 2. Async workflows

Implemented: `examples/async-validation`, with synchronous local errors,
cancellation, a bounded completed-answer cache, fresh submission checks,
blocking communication failures and retry. The normal verification command
type-checks the example and tests its validation behavior.

Partial execution is now an optional adapter capability, with opt-in Zod, Valibot and Luq subtree
validation; see [partial validation](partial-validation.md). There is still one
scheduler per form: unrelated edits can restart an unfinished lookup, including
its outstanding scopes. The async example uses whole-root validation.
Screen-reader acceptance
remains a manual task; automated correctness is not an accessibility audit.

## 3. Pre-publication performance measurement

The next step is measurement before publication. `npm run bench:editor` measures
emitted declarations across multiple files, varying form count, shape depth and
call count. It records cold, unchanged and edited completion/hover/diagnostic
requests in isolated processes, plus endpoint memory samples. A paired in-memory
counterfactual removes adapter type identity to quantify its cost without changing
the package. See `measurements-editor.md` and its raw JSON samples.

The sweep and an alternating-order confirmation both found an edited-completion
penalty from identity retention in the thirty-form fixture. See
[findings and profiling results](editor-findings.md). A NoInfer guard experiment
improved thirty-form completion in two runs. The first run's diagnostic regression
did not reproduce after the user reported reduced PC load, so the provisional
rejection was withdrawn. The guard was adopted in React `useField`, with generic
wrapper and union/record type regression coverage. `npm run bench:editor:guard`
compares it with the old signature reconstructed in memory. Representative
application models remain a follow-up before extending the change to other APIs.

These are TypeScript Language Service requests, not complete editor interaction
latency. The older compiler report remains a separate historical batch measurement.
Runtime typing/row latency, schema edits, heterogeneous schemas and real editor
integration remain separate questions. Reproduce a slow case before changing
algorithms; do not choose an unsupported universal form-size budget.

## 4. Pilot release (after measurement)

Target: TypeScript applications with shared inputs and deeply nested components.
Use the packed quick-start and async example as the reviewable trial. Before
publishing, record the exact revision/version, package-consumer verification,
known limitations and support boundaries. The existing manual publish workflow
defaults to dry-run. Publication and participant recruitment have not been done.

For each pilot, capture an anonymized record:

| Task | Outcome to record |
|---|---|
| Install the tarball in a clean app | Setup failures and time to first working form |
| Add a second independent form | Changes required in existing components |
| Extract a reusable input package | Registry coupling and declaration failures |
| Rename a nested field | Compile errors, missed bindings and repair time |
| Swap two existing valid paths | Whether tests/review detect the semantic mistake |
| Remove and reorder nested rows | Values, errors and focus remain attached correctly |
| Fail and retry a remote check | No stale success or inaccessible blocking error |
| Submit a conditional/wizard form | Users can reach every blocking issue |
| Use keyboard and screen reader | Labels, focus and announcements in a real browser |

Keep business data and credentials out of records. No participant messages are
sent automatically. Compare equivalent tasks and behavior; a smaller diff does
not establish fewer defects reaching users.

## Decisions after measurement and the pilot

Avoid new indexing structures or framework bindings until a measured need calls
for them. Choose practical budgets against the measured workloads and actual
pilot forms, then remeasure on the same machine and compiler after a change.

If typed addressing does not repay adoption costs, investigate integration with
another form runtime. This is an open product decision, not a promised adapter.
