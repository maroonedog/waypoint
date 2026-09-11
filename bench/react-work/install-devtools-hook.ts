// ===========================================================================
// install-devtools-hook.ts — how the harness sees a commit.
//
// React offers exactly one observation point that does not require the code
// being measured to cooperate: the global hook it looks for when it loads.
// Installing it here means no subject counts anything and no adapter author
// chooses where a counter goes — the difference between a benchmark a sceptic
// can check and one they have to trust.
//
// It must be installed BEFORE react-dom is imported, so this module is
// imported for its side effect at the top of the run and the subjects are
// loaded with dynamic import afterwards.
//
// The tree is walked INSIDE the commit, not afterwards. React keeps two fiber
// objects per position and swaps between them, so a tree walked two commits
// later can be built entirely from objects that were present two commits ago —
// which reads as a commit that changed nothing while the DOM plainly moved.
// Walking here costs the measured tree a little on every commit; it costs
// every subject the same, and this lane publishes counts rather than times.
// ===========================================================================

const HOST_COMPONENT = 5;

interface FiberLike {
  readonly tag: number;
  readonly child: FiberLike | null;
  readonly sibling: FiberLike | null;
}

export interface CommitSnapshot {
  /** Every fiber object in the tree as this commit left it. */
  readonly fibers: ReadonlySet<unknown>;
  /** Of those, the host nodes. */
  readonly hostFibers: ReadonlySet<unknown>;
}

export interface CommitLog {
  readonly commits: CommitSnapshot[];
  clear(): void;
}

const takeSnapshot = (root: unknown): CommitSnapshot => {
  const fibers = new Set<unknown>();
  const hostFibers = new Set<unknown>();
  const current = (root as { current?: FiberLike } | null)?.current;
  if (current === undefined || current === null) return { fibers, hostFibers };

  const stack: FiberLike[] = [current];
  while (stack.length > 0) {
    const fiber = stack.pop() as FiberLike;
    fibers.add(fiber);
    if (fiber.tag === HOST_COMPONENT) hostFibers.add(fiber);
    if (fiber.sibling !== null) stack.push(fiber.sibling);
    if (fiber.child !== null) stack.push(fiber.child);
  }
  return { fibers, hostFibers };
};

const log: CommitLog = {
  commits: [],
  clear() {
    log.commits.length = 0;
  },
};

export function installDevtoolsHook(): CommitLog {
  const holder = globalThis as unknown as Record<string, unknown>;
  if (holder["__REACT_DEVTOOLS_GLOBAL_HOOK__"] !== undefined) return log;

  let nextId = 1;
  const renderers = new Map<number, unknown>();
  holder["__REACT_DEVTOOLS_GLOBAL_HOOK__"] = {
    isDisabled: false,
    supportsFiber: true,
    renderers,
    // React calls this to let a minifier prove dead-code elimination ran.
    checkDCE: () => undefined,
    inject(renderer: unknown): number {
      const id = nextId;
      nextId += 1;
      renderers.set(id, renderer);
      return id;
    },
    onCommitFiberRoot(_id: number, root: unknown): void {
      log.commits.push(takeSnapshot(root));
    },
    onPostCommitFiberRoot: () => undefined,
    onCommitFiberUnmount: () => undefined,
    setStrictMode: () => undefined,
  };
  return log;
}

export const commitLog = log;
export const snapshotFibers = takeSnapshot;
