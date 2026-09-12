// The form that `validateOn` and the abort signal are both asked about, and
// the wait that has to happen before either answer can be read.
//
// WHY A MODULE FOR SIX LINES. Not to save the six. `settle` is here for the
// fact it encodes, which is the one premise both files depend on and neither
// asserts: a pass is SCHEDULED, not run where the edit happens. That gap is
// what makes `validateOn` countable at all — there is a moment between the
// edit and the pass at which the runtime gets to decide — and it is the same
// gap that lets a newer pass start while an older one is still running, which
// is the whole subject of the signal. A file that wrote its own
// `setTimeout(0)` inline would be keeping the mechanism and losing the reason,
// and the first person to see a count come out zero would try raising the
// timeout.
//
// FIELDS is two inert descriptors. Both files write their adapter by hand
// rather than derive one from a schema, because the subject is the runtime's
// decision to CALL the adapter, not what the adapter decides; a schema would
// put a real judgement in the way of that. Sharing the list is the smaller
// half of this module's reason to exist — `settle` is the other one.
export const FIELDS = [
  { path: "name", kind: "string", isRequired: true, constraints: {} },
  { path: "email", kind: "string", isRequired: true, constraints: {} },
];

export const settle = () => new Promise((done) => setTimeout(done, 0));
