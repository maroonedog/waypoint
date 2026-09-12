// ===========================================================================
// adopted-issues.ts — issues the runtime did not produce and now owns.
//
// A server says things a schema cannot: "that handle is taken", "the card was
// declined", "this applicant is a duplicate". Every form library calls the
// member that accepts them `setError`, and every one of them makes it a CELL
// the next pass overwrites. Here it is a MERGE INPUT to every pass instead,
// and that is the whole design.
//
// WHY NOT A CELL. Writing `issuesCell(path)` by hand was already possible and
// was already wrong in two directions at once, both visible in
// distribute-issues.ts. `record.paths` is filled only from the paths the PASS
// produced, so a hand-written path is never in the record and is never
// cleared — the message outlives whatever it was about. And the second loop
// writes every path the pass DID produce, so the same hand-written message is
// wiped the instant the validator says anything at all about that path. Which
// of the two happens depends on what the schema thinks, which is the one thing
// a server issue is not about. Worse, `publishBlockingIssues` and submit's
// `blockedBy` are both computed from the produced list, so a hand-written
// issue was shown, not counted, and did not block — a form that displays
// "card declined" and submits anyway.
//
// Merging fixes all of that with no second mechanism. The adopted list is
// concatenated onto `produced` BEFORE `distributeIssues`, before
// `publishBlockingIssues` and before submit's `blockingOf`, so one list feeds
// the cells, the count and the submit verdict and they cannot disagree. And
// because the merged list is what `distributeIssues` sees, an adopted path
// lands in `record.paths` — so the first pass after it is dropped clears its
// cell automatically. There is no cell-clearing code for adopted issues
// anywhere, and none is needed.
//
// AFTER `produced`, never before: a field showing both reads the schema's
// complaint and then the server's, which is the order input-attributes.ts
// already puts `aria-describedby` in — what the field wants, then what is
// wrong with what it was given.
//
// EACH CALL REPLACES THE WHOLE SET. A server response is a whole answer, not a
// patch: a second response that no longer mentions `email` means the email
// complaint is gone, and per-path merging would leave it standing with nothing
// that could ever remove it. It also gives `adoptIssues([])` the only reading
// anybody would guess. A caller holding two servers' answers concatenates them
// itself, which is one line it can write and this file cannot.
//
// It is held OUTSIDE the store, next to the issued-path record and the dormant
// roots, for the reason create-form.ts already gives about those two: both
// have to be ENUMERATED and re-addressed after a row move, and a store is five
// opaque members with no iteration.
// ===========================================================================
import type { FormIssue } from "../../contract/index.js";
import { isAncestorPath } from "../path/path-relation.js";
import { groupIssuesByPath } from "./group-issues-by-path.js";

export interface AdoptedIssues {
  /** Takes ownership of a whole answer, replacing the previous one. */
  adopt(issues: readonly FormIssue[]): void;
  /** What a pass should distribute: what it produced, then what was adopted. */
  mergedWith(produced: readonly FormIssue[]): readonly FormIssue[];
  /**
   * Drops every adopted issue a write at `path` could have made stale.
   *
   * @returns whether anything was dropped, so a caller knows whether the
   * verdict on screen still matches what is held.
   */
  forgetAround(path: string): boolean;
  /** @returns whether anything was dropped. */
  forgetEverything(): boolean;
  /**
   * How many answers have been adopted, ever. Submit reads it before it runs
   * and again afterwards, because "the answer this attempt was refused by"
   * and "the answer the handler just came back with" are the same set seen
   * from either side of one await, and only the count tells them apart.
   */
  adoptionCount(): number;
  /**
   * Re-addresses the adopted paths after a structural edit, exactly as
   * `followIssuedPaths` and `ParticipationIndex.remap` do — these are concrete
   * paths held outside the store, so renumbering the cells alone would leave
   * them pointing at whichever row moved into that index.
   */
  remap(moved: (path: string) => string | undefined): void;
}

/**
 * A write at `path` makes a verdict about `path` itself stale, and a verdict
 * about anything ABOVE or BELOW it too. Below: "this row is a duplicate" does
 * not survive an edit inside the row. Above: "this applicant already exists"
 * does not survive an edit to `applicant.email`. `isAncestorPath` is
 * segment-anchored, so `applicant` is not read as an ancestor of `applicants`.
 */
const isStaleAfterWriteAt = (adoptedPath: string, written: string): boolean =>
  adoptedPath === written ||
  isAncestorPath(adoptedPath, written) ||
  isAncestorPath(written, adoptedPath);

export function createAdoptedIssues(): AdoptedIssues {
  const byPath = new Map<string, readonly FormIssue[]>();
  let adoptions = 0;

  return {
    adopt(issues) {
      adoptions += 1;
      byPath.clear();
      for (const [path, atPath] of groupIssuesByPath(issues)) {
        byPath.set(path, atPath);
      }
    },

    mergedWith(produced) {
      // An ordinary form adopts nothing and pays one `.size` read per pass.
      if (byPath.size === 0) return produced;
      return produced.concat(...byPath.values());
    },

    forgetAround(written) {
      if (byPath.size === 0) return false;
      let dropped = false;
      for (const path of [...byPath.keys()]) {
        if (!isStaleAfterWriteAt(path, written)) continue;
        byPath.delete(path);
        dropped = true;
      }
      return dropped;
    },

    forgetEverything() {
      if (byPath.size === 0) return false;
      byPath.clear();
      return true;
    },

    // Counts adoptions, not drops. A drop is this runtime tidying up; an
    // adoption is the caller saying something new.
    adoptionCount: () => adoptions,

    remap(moved) {
      if (byPath.size === 0) return;
      // Collected before it is applied, for the reason followIssuedPaths
      // gives: one move's target can be another move's source.
      const rewritten = new Map<string, readonly FormIssue[]>();
      for (const [path, issues] of byPath) {
        const next = moved(path);
        if (next === undefined) continue;
        rewritten.set(
          next,
          next === path
            ? issues
            : issues.map((issue) => ({ ...issue, path: next }))
        );
      }
      byPath.clear();
      for (const [path, issues] of rewritten) byPath.set(path, issues);
    },
  };
}
