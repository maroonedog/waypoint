// ===========================================================================
// compare-verdicts.ts — where a subject and the oracle part company.
//
// Gated on the SET OF PATHS carrying a message, not on the message strings.
// Every library words its own errors and several let the schema word them, so
// a string comparison would report a wording difference as a disagreement. The
// strings are printed verbatim in the disagreement section instead, where a
// reader can judge them.
//
// Values are compared as strings, because that is what an input shows: a
// number field holding 42 and one holding "42" are the same form to the person
// filling it in.
// ===========================================================================
import type {
  ObservableState,
  VerdictDifference,
} from "./verdict.types.ts";

export interface VerdictComparison {
  readonly agrees: boolean;
  readonly differences: readonly VerdictDifference[];
}

export function compareVerdicts(
  subjectId: string,
  subject: ObservableState,
  oracle: ObservableState
): VerdictComparison {
  const differences: VerdictDifference[] = [];

  const subjectPaths = new Set(subject.messages.keys());
  const oraclePaths = new Set(oracle.messages.keys());
  for (const path of oraclePaths) {
    if (!subjectPaths.has(path)) {
      differences.push({
        channel: "messages",
        path,
        subject: undefined,
        oracle: oracle.messages.get(path),
      });
    }
  }
  for (const path of subjectPaths) {
    if (!oraclePaths.has(path)) {
      differences.push({
        channel: "messages",
        path,
        subject: subject.messages.get(path),
        oracle: undefined,
      });
    }
  }

  // The oracle renders nothing, so it carries no values. Where it does — a
  // future scenario that reads a transformed root — the comparison is here.
  for (const [path, held] of oracle.values) {
    const shown = subject.values.get(path);
    if (shown !== held) {
      differences.push({ channel: "values", path, subject: shown, oracle: held });
    }
  }

  void subjectId;
  return { agrees: differences.length === 0, differences };
}
