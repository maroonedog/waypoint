// ===========================================================================
// create-form.ts — assembles the runtime around one adapter.
//
// The adapter is the only thing here that knows a validator. Nothing below
// this line mentions a vendor, which is what lets the same runtime serve a
// type-first validator and a schema-first one.
//
// Every handle is cached by path for the life of the form. The handle owns the
// callbacks an input is given, so a fresh one per render would hand every
// input a new onChange every render.
//
// ONE LIST REACHES THE CELLS, THE COUNT AND THE SUBMIT VERDICT, which is what
// `commitVerdict` is for. Adopted issues — what a server said; see
// adopted-issues.ts — are merged onto the produced list BEFORE any of it is
// written, so the rendered issue cells, `errorCount` and `blockedBy` cannot
// come to disagree. A hand-written issue cell, which is what this replaces,
// disagrees by construction: it is shown, not counted, and does not block.
//
// That same merged list is PUBLISHED, as `blockedBy`, and not merely counted.
// An error summary has to name what blocked, and naming it is not derivable
// from the per-path cells: a store is five opaque members with no iteration,
// and an issue on a path no descriptor declares has no cell to be found in.
// `publishBlockingIssues` writes the list and its length together for that
// reason — two cells, one write site, so they cannot describe different passes.
//
// `lastProduced` is kept for one reason and it is worth the variable. Adopting
// and forgetting both have to change what is on screen IMMEDIATELY, and the
// alternative — asking the scheduler for a fresh pass — makes a server's
// verdict wait behind another round trip of the validator's, which for an
// async adapter is exactly the wait the server response just ended.
// ===========================================================================
import type { FormIssue, MaybeAsync } from "../../contract/index.js";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  blockingIssuesCell,
  errorCountCell,
  issuesCell,
  participatingCell,
  submitCountCell,
  submittingCell,
  validatingCell,
} from "../store/cell-key.js";
import { createCellStore } from "../store/create-cell-store.js";
import { assertConcretePath } from "../path/assert-concrete-path.js";
import { ancestorPathsOf } from "../path/path-relation.js";
import { declaredPathOf } from "../path/declared-path-of.js";
import { buildDescriptorTree } from "../descriptors/build-descriptor-tree.js";
import { createDescriptorIndex } from "../descriptors/descriptor-index.js";
import { createAddressablePaths } from "../descriptors/addressable-paths.js";
import { reportUnaddressable } from "./report-unaddressable.js";
import { createFieldCoverage } from "./field-coverage.js";
import { seedFormCells } from "../descriptors/seed-form-cells.js";
import { seedRootValue } from "../descriptors/seed-root-value.js";
import { createRowIdMinter } from "./row-index.js";
import { createRowsHandle, type RowsHandle } from "./create-rows-handle.js";
import type { RowCellMove } from "./row-cell-move.js";
import { createFormCellSources } from "./create-form-cell-sources.js";
import { createOpenValueCells } from "./open-value-cells.js";
import { createFieldHandle } from "./create-field-handle.js";
import { createFieldHandleCache } from "./field-handle-cache.js";
import { createParticipationIndex } from "./participation-index.js";
import {
  blockingIssues,
  publishBlockingIssues,
} from "./form-state-cells.js";
import {
  createIssuedPathRecord,
  distributeIssues,
  followIssuedPaths,
} from "./distribute-issues.js";
import { createAdoptedIssues } from "./adopted-issues.js";
import { createValidationScheduler } from "./schedule-validation.js";
import { submitForm } from "./submit-form.js";
import { resetForm } from "./reset-form.js";
import { NO_ISSUES } from "./interned-defaults.js";
import type { FieldHandle, FormHandle, FormOptions } from "./form.types.js";

export function createForm<T, TPath extends string = string>(
  options: FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const { adapter } = options;
  const store: FormCellStore = options.store ?? createCellStore();
  const descriptors = adapter.fields;
  const index = createDescriptorIndex(descriptors);
  const addressable = createAddressablePaths(descriptors);
  const tree = buildDescriptorTree(descriptors);
  const minter = createRowIdMinter();
  const participation = createParticipationIndex();
  const onFieldMismatch = options.onFieldMismatch ?? "warn";
  const coverage = createFieldCoverage({
    descriptors,
    readRoot: () => store.read(ROOT_CELL),
    isParticipating: participation.isParticipating,
  });

  const openCells = createOpenValueCells();
  const sources = createFormCellSources(store, openCells);

  const issued = createIssuedPathRecord();
  const adopted = createAdoptedIssues();
  let lastProduced: readonly FormIssue[] = NO_ISSUES;
  const blockingOf = (produced: readonly FormIssue[]): readonly FormIssue[] =>
    blockingIssues(produced, participation.isParticipating);
  const commitVerdict = (produced: readonly FormIssue[]): void => {
    lastProduced = produced;
    const merged = adopted.mergedWith(produced);
    store.batch(() => {
      distributeIssues(store, issued, merged, participation.isParticipating);
      publishBlockingIssues(store, blockingOf(merged));
    });
  };
  const judgeRoot = (root: unknown): MaybeAsync<readonly FormIssue[]> =>
    adapter.validate(root);
  const scheduler = createValidationScheduler({
    store,
    judge: (signal) => adapter.validate(store.read(ROOT_CELL), signal),
    commit: commitVerdict,
    // Arity, read once. An adapter that declared one parameter never causes an
    // AbortController to be constructed — see form-adapter.types.ts.
    cancelsSupersededPasses: adapter.validate.length >= 2,
  });

  const initialRoot = seedRootValue(descriptors, options.defaultValues);
  seedFormCells({
    store,
    descriptors,
    arrayPaths: index.arrayPaths,
    minter,
    root: initialRoot,
  });

  const setParticipating = (path: string, participating: boolean): void => {
    participation.set(path, participating);
    store.write(participatingCell(path), participating);
  };

  const validateOn = options.validateOn ?? "change";

  /**
   * Whether a verdict this write could have made stale is on screen.
   *
   * The path itself, and its ancestors. "This row is a duplicate" does not
   * survive an edit inside the row, which is the rule adopted-issues.ts states
   * and applies to what a server said; this is the same rule applied to what
   * the schema said. Bounded by the declared path depth, so it is a handful of
   * map lookups on a keystroke and no allocation beyond the ancestor list.
   *
   * NOT DESCENDANTS, and that is a limit rather than a decision: a store is
   * five opaque members with no iteration, so the paths below this one cannot
   * be enumerated to be asked. An issue on `items[0].sku` therefore does not
   * make an edit to `items` re-judge — which is the direction nobody types in.
   */
  const complaintNearby = (path: string): boolean => {
    if ((store.read(issuesCell(path))?.length ?? 0) > 0) return true;
    for (const ancestor of ancestorPathsOf(path)) {
      if ((store.read(issuesCell(ancestor))?.length ?? 0) > 0) return true;
    }
    return false;
  };

  /**
   * One pass judges the whole root, so this is the form's decision and the
   * field only reports which moment it is at, and which path it was.
   *
   * TWO CLAUSES MAKE "blur" AND "submit" USABLE RATHER THAN MERELY PRESENT,
   * and they are the same clause twice. Once the form has refused a submit,
   * fixing the field it complained about has to clear the complaint. And a
   * field that is ALREADY COMPLAINING has to clear it too, submit or no
   * submit: under "blur" the verdict was published at the last blur, and
   * without this it outlives the value it was about — the field goes on
   * carrying `aria-invalid` and a message about a value that is no longer
   * there, for as long as the reader spends fixing it. Measured before this
   * clause existed: a field left at "a needs 3", typed back to a valid "Ada",
   * still said "a needs 3" until it was blurred again.
   *
   * It costs a cell read on a keystroke, and only on the settings that asked
   * for fewer passes: under "change" the first clause has already returned.
   */
  const requestValidationAt = (
    moment: "change" | "blur",
    path: string
  ): void => {
    if (moment === validateOn) {
      scheduler.request();
      return;
    }
    if (moment !== "change") return;
    if ((store.read(submitCountCell) ?? 0) > 0 || complaintNearby(path)) {
      scheduler.request();
    }
  };

  const forgetAdoptedAround = (path: string): void => {
    if (adopted.forgetAround(path)) commitVerdict(lastProduced);
  };

  // Three things hold concrete paths OUTSIDE the store, so renumbering the
  // cells alone would leave all three pointing at whichever row moved into
  // that index: the record of which paths carried issues, the set of subtrees
  // that were switched off, and the issues a server handed us. Each is a list
  // that has to be ENUMERATED to be re-addressed, and a store is five opaque
  // members with no iteration.
  const followMovedCells = (moves: readonly RowCellMove[]): void => {
    followIssuedPaths(issued, moves);
    const movedTo = new Map(moves.map((move) => [move.source, move.target]));
    const followOne = (path: string): string | undefined =>
      movedTo.has(path) ? movedTo.get(path) : path;
    participation.remap(followOne);
    adopted.remap(followOne);
  };

  const handles = createFieldHandleCache();
  const rowsByPath = new Map<string, RowsHandle>();

  return {
    key: options.key,
    descriptors,
    tree,
    store,
    coverage,
    onFieldMismatch,
    errorCount: sources.of(errorCountCell, 0),
    blockedBy: sources.of(blockingIssuesCell, NO_ISSUES),
    submitting: sources.of(submittingCell, false),
    submitCount: sources.of(submitCountCell, 0),
    validating: sources.of(validatingCell, false),

    field(path) {
      assertConcretePath(path);
      // The store is what knows the paths, so this is the one place that has
      // to ask. Every hook, every component and every non-React caller comes
      // through here, and none of them keeps its own idea of what exists.
      if (!addressable.has(path))
        reportUnaddressable(path, addressable, options.key, onFieldMismatch);
      return handles.of(path, () =>
        createFieldHandle({
          store,
          sources,
          openCells,
          initialRoot,
          path,
          descriptor: index.at(path),
          judgeRoot,
          runValidation: scheduler.runNow,
          requestValidation: scheduler.request,
          requestValidationAt,
          forgetAdoptedAround,
          setParticipating,
        })
      ) as FieldHandle<never>;
    },

    rows(arrayPath) {
      assertConcretePath(arrayPath);
      // The question `field` asks, asked here too. A list this form does not
      // have hands back an empty order, and an edit to it writes a member of
      // the ROOT that no descriptor covers: nothing is drawn, nothing is
      // judged, and until this line nothing was said about it either.
      if (!addressable.has(arrayPath))
        reportUnaddressable(
          arrayPath,
          addressable,
          options.key,
          onFieldMismatch
        );
      const existing = rowsByPath.get(arrayPath);
      if (existing !== undefined) return existing;
      const created = createRowsHandle({
        store,
        sources,
        openCells,
        arrayPath,
        declaredUnder: index.declaredUnder(declaredPathOf(arrayPath)),
        minter,
        requestValidation: scheduler.request,
        onCellsMoved: followMovedCells,
      });
      rowsByPath.set(arrayPath, created);
      return created;
    },

    setParticipating(path, participating) {
      // The same refusal `field` and `rows` make, and it was missing here:
      // a dormant root is matched against concrete paths with
      // `isAncestorPath`, which is segment-anchored, so `items[*]` matched
      // nothing and switching a subtree off silently did nothing at all.
      assertConcretePath(path);
      setParticipating(path, participating);
      scheduler.request();
    },

    adoptIssues(issues) {
      adopted.adopt(issues);
      // Now, off the last pass, rather than by asking for a new one. See the
      // header: a fresh pass would put a server's answer behind the
      // validator's, which for an async adapter is another round trip.
      commitVerdict(lastProduced);
    },

    // ONE SUBMIT CONSUMES THE SERVER'S LAST ANSWER: this attempt is refused by
    // it and REPORTS it, and then it is dropped so the next press asks again.
    //
    // "Last answer" means the one that was already held when the press
    // happened. The handler is where the round trip lives — `await api.save()`
    // and then `form.adoptIssues(response.issues)` is the shape this member
    // exists for — and dropping unconditionally afterwards wiped exactly that,
    // so the message the server had just sent never reached the screen at all.
    // Measured: an adopt inside the handler ended with errorCount 0 and no
    // issue anywhere. So the drop is conditional on nothing having been
    // adopted while this attempt was in flight.
    //
    // Both halves are load-bearing and neither works alone. Without the merge
    // into `blockingOf` an adopted issue would be shown and counted and then
    // not block — which is the whole defect a hand-written issue cell already
    // had, arrived at by a longer road. Without the drop afterwards, an issue
    // on a path with no input ("the card was declined") could never be cleared
    // by any edit, `errorCount` would hold it at one for ever, and the
    // disabled-button idiom built on that count would make pressing submit —
    // the only thing that could clear it — impossible. Measured as a test:
    // two presses with nothing changed between them always get through.
    //
    // `blockingOf` is merged HERE rather than inside submitForm, which
    // computes `blockedBy` from the raw produced list and stays ignorant of
    // this function's bookkeeping.
    submit: (handler) => {
      const adoptedWhenPressed = adopted.adoptionCount();
      return submitForm({
        store,
        judgeNow: () => scheduler.runNow(),
        blockingOf: (produced) => blockingOf(adopted.mergedWith(produced)),
        handler,
      }).finally(() => {
        if (adopted.adoptionCount() !== adoptedWhenPressed) return;
        if (adopted.forgetEverything()) commitVerdict(lastProduced);
      });
    },

    reset(defaultValues) {
      resetForm({
        store,
        descriptors,
        arrayPaths: index.arrayPaths,
        minter,
        nextRoot: seedRootValue(
          descriptors,
          defaultValues === undefined ? options.defaultValues : defaultValues
        ),
      });
      issued.paths.clear();
      adopted.forgetEverything();
      scheduler.request();
    },

    readRoot: () => store.read(ROOT_CELL),
    validate: () => scheduler.runNow(),
  };
}
