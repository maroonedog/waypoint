// ===========================================================================
// measure-wiring-overhead.ts — what a subject costs before it holds a field.
//
// Each subject is mounted with NO leaves and its fibers are counted. What
// remains is the providers, contexts and wrappers its idiom requires, and it
// is the number that has to be taken out before two subjects can be compared
// on how much of the tree an interaction moved.
//
// It is MEASURED, not declared. A declared overhead is a number the author of
// a subject chooses, and the one number a comparison like this must not let an
// author choose is the one that decides whether their tree is comparable.
// ===========================================================================
import type { Subject } from "./subjects/subject.types.ts";
import type { MountContext } from "./subjects/mount-context.types.ts";

import { commitLog } from "./react-work/install-devtools-hook.ts";
import { settle } from "./react-work/settle.ts";

export async function measureWiringOverhead(
  subject: Subject,
  context: MountContext,
  container: HTMLElement
): Promise<number> {
  commitLog.clear();
  const mounted = subject.mount(container, context);
  await settle();
  const treeFibers = commitLog.commits.at(-1)?.fibers.size ?? 0;
  mounted.unmount();
  return treeFibers;
}
