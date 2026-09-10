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
import type { FormFieldDescriptor, FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import {
  ROOT_CELL,
  dirtyCell,
  issuesCell,
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
  readonly judgeRoot: (root: unknown) => readonly FormIssue[];
  readonly commitVerdict: (produced: readonly FormIssue[]) => void;
  readonly requestValidation: () => void;
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
    commitVerdict,
    requestValidation,
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
    },
    setValue(next) {
      fanOutWrite({ store, openCells, initialRoot, path, next });
      requestValidation();
    },
    markTouched() {
      store.write(touchedCell(path), true);
    },
    validate() {
      const produced = judgeRoot(store.read(ROOT_CELL));
      commitVerdict(produced);
      return mine(produced);
    },
    check(candidate) {
      const probe = writeValueAt(store.read(ROOT_CELL), path, candidate);
      return mine(judgeRoot(probe));
    },
  };
}
