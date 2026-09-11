// ===========================================================================
// create-field-handle.ts — one field's reads, writes and verdicts.
//
// `validate` and `check` are the same computation the form runs, filtered to
// this path. That is a correctness argument rather than a simplification: a
// runtime with a separate per-field engine gives a conditionally rendered
// field a different verdict depending on which engine produced it, and the
// difference shows up only once a field is unmounted.
//
// `check` writes nothing at all. Asking whether a value WOULD be acceptable is
// not the same as putting it in the form, and a probe that mutated the store
// would move every cross-field verdict as a side effect of asking.
// ===========================================================================
import {
  isPending,
  type FormFieldDescriptor,
  type FormIssue,
  type MaybeAsync,
} from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  dirtyCell,
  issuesCell,
  participatingCell,
  touchedCell,
  valueCell,
} from "../store/cell-key.js";
import { writeValueAt } from "../path/write-value-at.js";
import type { CellSourceRegistry } from "./cell-source.js";
import { NO_ISSUES } from "./interned-defaults.js";
import type { OpenValueCells } from "./open-value-cells.js";
import { fanOutWrite } from "./fan-out-write.js";
import type { FieldHandle } from "./form.types.js";

export interface FieldHandleRequest {
  readonly store: FormCellStore;
  readonly sources: CellSourceRegistry;
  readonly openCells: OpenValueCells;
  readonly initialRoot: unknown;
  readonly path: string;
  readonly descriptor: FormFieldDescriptor | undefined;
  readonly judgeRoot: (root: unknown) => MaybeAsync<readonly FormIssue[]>;
  /** Judges now, through the scheduler, so a late answer is discarded. */
  readonly runValidation: () => MaybeAsync<readonly FormIssue[]>;
  readonly requestValidation: () => void;
  readonly setParticipating: (path: string, participating: boolean) => void;
}

export function createFieldHandle<TValue>(
  request: FieldHandleRequest
): FieldHandle<TValue> {
  const {
    store,
    sources,
    openCells,
    initialRoot,
    path,
    descriptor,
    judgeRoot,
    runValidation,
    requestValidation,
    setParticipating,
  } = request;

  const mine = (produced: readonly FormIssue[]): readonly FormIssue[] => {
    const found = produced.filter((issue) => issue.path === path);
    return found.length === 0 ? NO_ISSUES : found;
  };

  return {
    path,
    descriptor,
    sources: {
      value: sources.of<TValue | undefined>(
        valueCell(path) as never,
        undefined
      ),
      issues: sources.of(issuesCell(path), NO_ISSUES),
      touched: sources.of(touchedCell(path), false),
      dirty: sources.of(dirtyCell(path), false),
      participating: sources.of(participatingCell(path), true),
    },
    setValue(next) {
      fanOutWrite({ store, openCells, initialRoot, path, next });
      requestValidation();
    },
    markTouched() {
      store.write(touchedCell(path), true);
    },
    setParticipating(participating) {
      setParticipating(path, participating);
      store.write(participatingCell(path), participating);
      requestValidation();
    },
    validate() {
      const outcome = runValidation();
      return isPending(outcome) ? outcome.then(mine) : mine(outcome);
    },
    check(candidate) {
      const probe = writeValueAt(store.read(ROOT_CELL), path, candidate);
      const outcome = judgeRoot(probe);
      return isPending(outcome) ? outcome.then(mine) : mine(outcome);
    },
  };
}
