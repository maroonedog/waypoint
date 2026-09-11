// ===========================================================================
// settle.ts — wait until nothing more is going to happen.
//
// Macrotasks, not a microtask. Validation is coalesced to a microtask, React
// flushes its own work on top of that, and its passive effects are scheduled
// through a channel of their own — so a measurement taken one turn after an
// event would catch some subjects mid-pass and others not. That is a
// difference in when the ruler was read, not in what was measured.
//
// Three turns rather than one, because a subscription installed in a passive
// effect is not installed after a single turn. A harness that settles for one
// turn measures a subject whose subscriptions are not yet live, which reads as
// a form that renders correctly and responds to nothing.
// ===========================================================================

const TURNS = 3;

const turn = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

export async function settle(): Promise<void> {
  for (let taken = 0; taken < TURNS; taken += 1) await turn();
}
