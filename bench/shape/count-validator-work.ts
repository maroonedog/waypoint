// ===========================================================================
// count-validator-work.ts — how much the schema was actually asked.
//
// This is the mechanism that separates "fast" from "did less". A runtime that
// judges one field per keystroke and one that judges the whole root both
// produce a verdict; only this tells you which. Both figures appear on every
// row of the report, beside the counts, so the reader never has to take the
// ratio on trust.
//
// The counter is owned by the harness and wrapped around the shared schema
// before any subject sees it, so no adapter can decide where it is placed or
// whether it advances.
//
// `pathsJudged` counts the declared leaves PRESENT in the root that was handed
// over. A subject that validates a single field hands over a one-field object
// and scores one; a subject that judges the whole root scores all of them.
// It is a measure of what was submitted for judgement, not of what the schema
// chose to look at, and the report says so.
// ===========================================================================
import { readValueAt } from "form-core";

export interface ValidatorWork {
  passes: number;
  pathsJudged: number;
  /** Wall time inside the schema alone, so a slow schema is not a slow store. */
  nanoseconds: bigint;
  /** Every root the subject submitted, for assert-validated-root-matches. */
  readonly rootsSeen: unknown[];
}

export interface CountedSchema<TSchema> {
  readonly schema: TSchema;
  readonly work: ValidatorWork;
  reset(): void;
}

const countPresentPaths = (
  root: unknown,
  concretePaths: readonly string[]
): number => {
  let present = 0;
  for (const path of concretePaths) {
    if (readValueAt(root, path) !== undefined) present += 1;
  }
  return present;
};

/**
 * Wraps `safeParse` and `parse`. The returned object is otherwise the schema
 * itself, so a library that reads any other member of it sees what it expects.
 */
export function countValidatorWork<TSchema extends object>(
  schema: TSchema,
  concretePaths: readonly string[]
): CountedSchema<TSchema> {
  const work: ValidatorWork = {
    passes: 0,
    pathsJudged: 0,
    nanoseconds: 0n,
    rootsSeen: [],
  };

  const record = <TResult>(root: unknown, run: () => TResult): TResult => {
    work.passes += 1;
    work.pathsJudged += countPresentPaths(root, concretePaths);
    work.rootsSeen.push(root);
    const start = process.hrtime.bigint();
    try {
      return run();
    } finally {
      work.nanoseconds += process.hrtime.bigint() - start;
    }
  };

  const PARSERS = new Set([
    "safeParse",
    "parse",
    "safeParseAsync",
    "parseAsync",
  ]);

  const counted = new Proxy(schema, {
    get(target, property, receiver) {
      const held: unknown = Reflect.get(target, property, receiver);

      if (typeof held === "function" && PARSERS.has(String(property))) {
        return (root: unknown, ...rest: unknown[]) =>
          record(root, () =>
            (held as (...args: unknown[]) => unknown).call(target, root, ...rest)
          );
      }

      // A library that takes a Standard Schema never touches safeParse: it
      // calls `~standard.validate`. Wrapping only the zod surface would leave
      // that library reading zero passes and looking as though it validated
      // nothing, which is the opposite of what happened.
      if (
        property === "~standard" &&
        held !== null &&
        typeof held === "object"
      ) {
        const standard = held as Record<string, unknown>;
        return new Proxy(standard, {
          get(inner, innerProperty, innerReceiver) {
            const member: unknown = Reflect.get(
              inner,
              innerProperty,
              innerReceiver
            );
            if (innerProperty === "validate" && typeof member === "function") {
              return (root: unknown, ...rest: unknown[]) =>
                record(root, () =>
                  (member as (...args: unknown[]) => unknown).call(
                    inner,
                    root,
                    ...rest
                  )
                );
            }
            return typeof member === "function" ? member.bind(inner) : member;
          },
        });
      }

      return typeof held === "function" ? held.bind(target) : held;
    },
  });

  return {
    schema: counted,
    work,
    reset() {
      work.passes = 0;
      work.pathsJudged = 0;
      work.nanoseconds = 0n;
      work.rootsSeen.length = 0;
    },
  };
}
