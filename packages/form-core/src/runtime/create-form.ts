// ===========================================================================
// create-form.ts — assembles the runtime around one adapter.
//
// Every cell a declared path needs is written here, before any component
// exists. What a component does later is subscribe; it does not register a
// field, seed a default, or reset anything on unmount.
//
// The adapter is the only thing that knows a validator. Nothing below this
// line mentions a vendor.
// ===========================================================================
import type { FormFieldDescriptor, FormIssue } from "form-contract";
import type { FormCellStore } from "../store/form-cell-store.types.js";
import { ROOT_CELL, errorCountCell, valueCell } from "../store/cell-key.js";
import { createCellStore } from "../store/create-cell-store.js";
import { readValueAt } from "../path/read-value-at.js";
import { seedRootValue } from "../descriptors/seed-root-value.js";
import { createCellSourceRegistry } from "./cell-source.js";
import { createOpenValueCells } from "./open-value-cells.js";
import { createFieldHandle } from "./create-field-handle.js";
import { createFieldHandleCache } from "./field-handle-cache.js";
import {
  createIssuedPathRecord,
  distributeIssues,
} from "./distribute-issues.js";
import { createValidationScheduler } from "./schedule-validation.js";
import type { FieldHandle, FormHandle, FormOptions } from "./form.types.js";

const VALUE_CHANNEL_PREFIX = "value:";

export function createForm<T, TPath extends string = string>(
  options: FormOptions<T, TPath>
): FormHandle<T, TPath> {
  const { adapter } = options;
  const store: FormCellStore = options.store ?? createCellStore();
  const descriptors = adapter.fields;
  const initialRoot = seedRootValue(descriptors, options.defaultValues);

  const byPath = new Map<string, FormFieldDescriptor>();
  for (const descriptor of descriptors) byPath.set(descriptor.path, descriptor);

  const openCells = createOpenValueCells();
  const sources = createCellSourceRegistry(store, (key) => {
    if (!key.startsWith(VALUE_CHANNEL_PREFIX)) return () => undefined;
    const path = key.slice(VALUE_CHANNEL_PREFIX.length);
    openCells.open(path);
    return () => openCells.close(path);
  });

  const issued = createIssuedPathRecord();
  const commitVerdict = (produced: readonly FormIssue[]): void => {
    store.batch(() => {
      distributeIssues(store, issued, produced);
      store.write(errorCountCell, produced.length);
    });
  };
  const judgeRoot = (root: unknown): readonly FormIssue[] =>
    adapter.validate(root);
  const scheduler = createValidationScheduler(() => {
    const produced = judgeRoot(store.read(ROOT_CELL));
    commitVerdict(produced);
    return produced;
  });

  store.batch(() => {
    store.write(ROOT_CELL, initialRoot);
    for (const descriptor of descriptors) {
      if (descriptor.path.includes("[*]")) continue;
      store.write(valueCell(descriptor.path), readValueAt(initialRoot, descriptor.path));
    }
    store.write(errorCountCell, 0);
  });

  const handles = createFieldHandleCache();

  return {
    descriptors,
    store,
    errorCount: sources.of(errorCountCell, 0),
    field(path) {
      return handles.of(path, () =>
        createFieldHandle({
          store,
          sources,
          openCells,
          initialRoot,
          path,
          descriptor: byPath.get(path),
          judgeRoot,
          commitVerdict,
          requestValidation: scheduler.request,
        })
      ) as FieldHandle<never>;
    },
    readRoot: () => store.read(ROOT_CELL),
    validate: () => scheduler.runNow(),
  };
}
