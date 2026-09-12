// ===========================================================================
// zustand-adapter.type-test.ts — the adapter accepts a real zustand store.
//
// The point of a substitutable store is that somebody can hand their own one
// over. An adapter whose parameter type no real store satisfies is
// substitutable only on paper, and a runtime test cannot notice: it passes a
// store that happens to fit and never asks whether the types agreed.
// ===========================================================================
import { createStore } from "zustand/vanilla";
import { createZustandCellStore } from "@maroonedog/waypoint/store-zustand";
import type { FormCellStore } from "@maroonedog/waypoint/core";

// The empty-state form, which is what a form-only store looks like.
const bare: FormCellStore = createZustandCellStore(createStore(() => ({})));
void bare;

// A store the host application already owns, holding its own state beside the
// cells. This is the case the adapter exists for.
interface AppState {
  readonly theme: string;
  [cell: string]: unknown;
}
const shared: FormCellStore = createZustandCellStore(
  createStore<AppState>(() => ({ theme: "dark" }))
);
void shared;

// A plainly typed record store.
const record: FormCellStore = createZustandCellStore(
  createStore<Record<string, unknown>>(() => ({}))
);
void record;
