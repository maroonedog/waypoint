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
// ===========================================================================
import type { FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  errorCountCell,
  participatingCell,
  submitCountCell,
  submittingCell,
  validatingCell,
} from "../store/cell-key.js";
import { createCellStore } from "../store/create-cell-store.js";
import { assertConcretePath } from "../path/assert-concrete-path.js";
import { declaredPathOf } from "../path/declared-path-of.js";
import { buildDescriptorTree } from "../descriptors/build-descriptor-tree.js";
import { createDescriptorIndex } from "../descriptors/descriptor-index.js";
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
import { blockingIssues, writeErrorCount } from "./form-state-cells.js";
import {
  createIssuedPathRecord,
  distributeIssues,
  followIssuedPaths,
} from "./distribute-issues.js";
import { createValidationScheduler } from "./schedule-validation.js";
import { submitForm } from "./submit-form.js";
import { resetForm } from "./reset-form.js";
import type { FieldHandle, FormHandle, FormOptions } from "./form.types.js";

export function createForm<T, TPath extends string = string>(
  options: FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const { adapter } = options;
  const store: FormCellStore = options.store ?? createCellStore();
  const descriptors = adapter.fields;
  const index = createDescriptorIndex(descriptors);
  const tree = buildDescriptorTree(descriptors);
  const minter = createRowIdMinter();
  const participation = createParticipationIndex();

  const openCells = createOpenValueCells();
  const sources = createFormCellSources(store, openCells);

  const issued = createIssuedPathRecord();
  const blockingOf = (produced: readonly FormIssue[]): readonly FormIssue[] =>
    blockingIssues(produced, participation.isParticipating);
  const commitVerdict = (produced: readonly FormIssue[]): void => {
    store.batch(() => {
      distributeIssues(store, issued, produced, participation.isParticipating);
      writeErrorCount(store, blockingOf(produced));
    });
  };
  const judgeRoot = (root: unknown): readonly FormIssue[] =>
    adapter.validate(root);
  const scheduler = createValidationScheduler(() => {
    const produced = judgeRoot(store.read(ROOT_CELL));
    commitVerdict(produced);
    return produced;
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

  // Two things hold concrete paths OUTSIDE the store, so renumbering the
  // cells alone would leave both pointing at whichever row moved into that
  // index: the record of which paths carried issues, and the set of subtrees
  // that were switched off.
  const followMovedCells = (moves: readonly RowCellMove[]): void => {
    followIssuedPaths(issued, moves);
    const movedTo = new Map(moves.map((move) => [move.source, move.target]));
    participation.remap((path) =>
      movedTo.has(path) ? movedTo.get(path) : path
    );
  };

  const handles = createFieldHandleCache();
  const rowsByPath = new Map<string, RowsHandle>();

  return {
    descriptors,
    tree,
    store,
    errorCount: sources.of(errorCountCell, 0),
    submitting: sources.of(submittingCell, false),
    submitCount: sources.of(submitCountCell, 0),
    validating: sources.of(validatingCell, false),

    field(path) {
      assertConcretePath(path);
      return handles.of(path, () =>
        createFieldHandle({
          store,
          sources,
          openCells,
          initialRoot,
          path,
          descriptor: index.at(path),
          judgeRoot,
          commitVerdict,
          requestValidation: scheduler.request,
          setParticipating,
        })
      ) as FieldHandle<never>;
    },

    rows(arrayPath) {
      assertConcretePath(arrayPath);
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
      setParticipating(path, participating);
      scheduler.request();
    },

    submit: (handler) =>
      submitForm({
        store,
        judgeNow: () => scheduler.runNow(),
        blockingOf,
        handler,
      }),

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
      scheduler.request();
    },

    readRoot: () => store.read(ROOT_CELL),
    validate: () => scheduler.runNow(),
  };
}
