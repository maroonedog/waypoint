// ===========================================================================
// interned-defaults.ts — one frozen instance per empty value.
//
// A reader handed to useSyncExternalStore must return the same reference when
// nothing changed. Building a fresh `[]` for a field with no issues makes
// every snapshot differ from the last, which React reports as
// "The result of getSnapshot should be cached" and then loops.
//
// It also means `field.issues.length` cannot throw on a field that has never
// been validated: the empty list is a value, not an absence.
// ===========================================================================
import type { FormIssue } from "../../contract/index.js";

export const NO_ISSUES: readonly FormIssue[] = Object.freeze([]);

/** The empty row order, for an array that holds nothing yet. */
export const NO_ROWS: readonly string[] = Object.freeze([]);
