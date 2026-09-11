// ===========================================================================
// oracle-verdict.ts — what the schema says, with no form library involved.
//
// A plain reducer applies the scenario to a clone of the defaults and the
// shared schema judges the result. No React, no store, no subscription.
//
// THIS IS NOT NEUTRAL GROUND TRUTH, and the report says so. "The whole root,
// judged on every settled change, every issue on its own path" is a
// description of form-contract policy. That is why a subject is scored WITHIN
// its own declared policy and why a library shipping a different default gets
// `by design` rather than `disagrees`.
// ===========================================================================
import { readValueAt, writeValueAt } from "form-core";
import { concretePaths } from "../shape/declared-paths.ts";
import { orderDefaults } from "../shape/order-defaults.ts";
import { issuePathToConcretePath } from "../shape/issue-path-to-concrete-path.ts";
import type { ObservableState } from "./verdict.types.ts";

export interface OracleEdit {
  readonly path: string;
  readonly value: string;
}

interface ParseOutcome {
  readonly success: boolean;
  readonly error?: {
    readonly issues: readonly {
      readonly path: readonly (string | number)[];
      readonly message: string;
    }[];
  };
}

export interface OracleSchema {
  safeParse(root: unknown): unknown;
}

/** The root the reducer built, kept so a subject root can be compared to it. */
export interface OracleReading {
  readonly root: unknown;
  readonly state: ObservableState;
}

export function oracleVerdict(
  schema: OracleSchema,
  edits: readonly OracleEdit[]
): OracleReading {
  let root: unknown = orderDefaults();
  for (const edit of edits) {
    root = writeValueAt(root, edit.path, edit.value);
  }

  const outcome = schema.safeParse(root) as ParseOutcome;
  const messages = new Map<string, string>();
  if (!outcome.success && outcome.error !== undefined) {
    for (const issue of outcome.error.issues) {
      const path = issuePathToConcretePath(issue.path);
      if (!messages.has(path)) messages.set(path, issue.message);
    }
  }

  // Every declared path, as the string an input would show. This is what
  // lets a steady-state scenario prove it did something, and it catches a
  // subject whose typed character never reached the document.
  const values = new Map<string, string>();
  for (const path of concretePaths) {
    const held = readValueAt(root, path);
    values.set(path, held === undefined ? "" : String(held));
  }
  const invalidPaths = new Set<string>(messages.keys());

  return { root, state: { values, messages, invalidPaths } };
}
