// ===========================================================================
// count-dom-mutations.ts — what actually reached the document.
//
// The one count in this harness that owes nothing to React internals. A
// MutationObserver sees what a browser would have had to lay out, whatever
// produced it, so it is the figure that survives a React upgrade changing how
// fibers are shaped.
//
// Attribute changes are counted apart from node changes, because a controlled
// input rewriting `value` and a list inserting a row are different costs, and
// one total would hide which of them a subject is paying.
// ===========================================================================

export interface DomMutationCount {
  readonly attributes: number;
  readonly characterData: number;
  readonly childList: number;
}

export interface DomMutationRecorder {
  stop(): DomMutationCount;
}

export function recordDomMutations(container: Node): DomMutationRecorder {
  const counted = { attributes: 0, characterData: 0, childList: 0 };
  const ObserverCtor = (
    globalThis as unknown as { MutationObserver: typeof MutationObserver }
  ).MutationObserver;

  const take = (records: readonly MutationRecord[]): void => {
    for (const record of records) {
      if (record.type === "attributes") counted.attributes += 1;
      else if (record.type === "characterData") counted.characterData += 1;
      else counted.childList += 1;
    }
  };

  const observer = new ObserverCtor(take);
  observer.observe(container, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  return {
    stop() {
      // takeRecords drains what the callback has not been handed yet, so a
      // mutation that landed in the last microtask is not lost.
      take(observer.takeRecords());
      observer.disconnect();
      return { ...counted };
    },
  };
}
