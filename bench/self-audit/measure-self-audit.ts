// ===========================================================================
// measure-self-audit.ts — one size, driven through the core runtime.
//
// NO REACT, deliberately. The number this lane exists for is the one React
// cannot see, so putting React in front of it would add fiber bookkeeping to a
// measurement whose whole claim is that no fiber moves. What is installed
// instead is the same subscription React installs: `useCell` hands
// `sources.value.subscribe` to `useSyncExternalStore`, so opening every leaf
// here opens exactly the cells a rendered form opens, and one per rendered
// field is what a rendered form has.
//
// FOUR SCENARIOS, because "open cells" is not one situation. A form with one
// field on screen is the floor; a form with every field on screen is what the
// design document worried about; a container on screen is the only case where
// the ancestor loop does anything; and a write AT a container is the only case
// where the scan's second loop finds anything at all. Reporting only the first
// two would be an audit that confirmed the author's fears and stopped.
// ===========================================================================
import { isPending, type FormAdapter } from "@maroonedog/waypoint";
import { createForm, type FormHandle } from "@maroonedog/waypoint/core";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import type { Shape } from "../shape/build-shape.ts";
import { createCountingCellStore } from "./counting-cell-store.ts";
import {
  openPathsByReadBranch,
  refreshesProducedBy,
  scanShapeOf,
} from "./count-open-cell-scan.ts";
import { assertDesignClaims } from "./assert-design-claims.ts";
import type { MountRow, PassRow, SelfAuditRun, WriteRow } from "./self-audit.types.ts";

/** The leaf a keystroke lands on, and the container above it. */
const EDITED_LEAF = "applicant.lastName";
const EDITED_CONTAINER = "applicant";
/** The array whose members are the only open cells any scan can find. */
const EDITED_ARRAY = "items";

interface ScenarioPlan {
  readonly id: string;
  readonly writtenPath: string;
  readonly next: unknown;
  /** Which paths have a reader, given the shape's leaves. */
  openPaths(shape: Shape): readonly string[];
}

const PLANS: readonly ScenarioPlan[] = [
  {
    id: "one-field-on-screen",
    writtenPath: EDITED_LEAF,
    next: "Lovelac",
    openPaths: () => [EDITED_LEAF],
  },
  {
    id: "every-field-on-screen",
    writtenPath: EDITED_LEAF,
    next: "Lovelac",
    openPaths: (shape) => shape.concretePaths,
  },
  {
    id: "every-field-and-its-group",
    writtenPath: EDITED_LEAF,
    next: "Lovelac",
    openPaths: (shape) => [...shape.concretePaths, EDITED_CONTAINER],
  },
  {
    id: "write-at-a-container",
    writtenPath: EDITED_ARRAY,
    next: [
      { sku: "A-1", name: "Annual licence", quantity: 2, unitPrice: 120000 },
      { sku: "B-2", name: "Onboarding", quantity: 2, unitPrice: 60000 },
      { sku: "C-3", name: "Support", quantity: 3, unitPrice: 20000 },
    ],
    openPaths: (shape) => shape.concretePaths,
  },
];

const adapterFor = (shape: Shape): FormAdapter<unknown, string> =>
  zodFormResolver(
    shape.schema as Parameters<typeof zodFormResolver>[0]
  ) as FormAdapter<unknown, string>;

const candidatesFor = (shape: Shape): readonly string[] => [
  ...shape.concretePaths,
  EDITED_CONTAINER,
  EDITED_ARRAY,
];

function measureWrite(shape: Shape, plan: ScenarioPlan): WriteRow {
  const counting = createCountingCellStore();
  const form: FormHandle<unknown, string> = createForm({
    adapter: adapterFor(shape),
    defaultValues: shape.defaults(),
    store: counting.store,
  });
  for (const path of plan.openPaths(shape)) {
    form.field(path).sources.value.subscribe(() => undefined);
  }

  const byReadBranch = openPathsByReadBranch(counting, form, candidatesFor(shape));
  const bySubscription = counting.liveValuePaths();
  const scan = scanShapeOf(byReadBranch, plan.writtenPath);

  counting.reset();
  form.field(plan.writtenPath).setValue(plan.next as never);
  const { writes, reads, notificationsDelivered, writtenKeys } = counting.tally;

  assertDesignClaims({
    shapeId: shape.id,
    writtenPath: plan.writtenPath,
    bySubscription,
    byReadBranch,
    scan,
    writtenKeys,
  });

  return {
    shapeId: shape.id,
    leaves: shape.concretePaths.length,
    scenarioId: plan.id,
    writtenPath: plan.writtenPath,
    openValueCells: scan.openValueCells,
    openCellScanLength: scan.openCellScanLength,
    ancestorProbes: scan.ancestorProbes,
    valueCellsRefreshed: refreshesProducedBy(scan),
    storeWrites: writes,
    storeReads: reads,
    notificationsDelivered,
  };
}

function measureMount(shape: Shape): MountRow {
  const counting = createCountingCellStore();
  createForm({
    adapter: adapterFor(shape),
    defaultValues: shape.defaults(),
    store: counting.store,
  });
  const { writes, reads, writtenKeys } = counting.tally;
  return {
    shapeId: shape.id,
    leaves: shape.concretePaths.length,
    cellsSeededAtMount: writes,
    valueCellsSeeded: writtenKeys.filter((key) => key.startsWith("value:")).length,
    storeReadsAtMount: reads,
  };
}

async function measurePass(shape: Shape): Promise<PassRow> {
  const counting = createCountingCellStore();
  // `submit`, so the only pass in this measurement is the one asked for below.
  // On the default `change` a microtask pass would land in the middle of it.
  const form: FormHandle<unknown, string> = createForm({
    adapter: adapterFor(shape),
    defaultValues: shape.defaults(),
    store: counting.store,
    validateOn: "submit",
  });
  for (const path of shape.concretePaths) {
    form.field(path).sources.value.subscribe(() => undefined);
  }
  form.field(EDITED_LEAF).setValue("" as never);

  counting.reset();
  const outcome = form.validate();
  const produced = isPending(outcome) ? await outcome : outcome;
  const { notificationsDelivered, writtenKeys } = counting.tally;

  return {
    shapeId: shape.id,
    leaves: shape.concretePaths.length,
    issuesProduced: produced.length,
    issueCellsWritten: writtenKeys.filter((key) => key.startsWith("issues:")).length,
    notificationsDelivered,
  };
}

export async function measureSelfAudit(shape: Shape): Promise<SelfAuditRun> {
  return {
    mount: measureMount(shape),
    writes: PLANS.map((plan) => measureWrite(shape, plan)),
    pass: await measurePass(shape),
  };
}
