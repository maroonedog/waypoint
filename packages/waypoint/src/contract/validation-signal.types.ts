// ===========================================================================
// validation-signal.types.ts — the signal a superseded pass is cancelled with,
// spelled without depending on a host that has one.
//
// `AbortSignal` is a name this package MAY NOT WRITE. `./contract` and
// `./core` compile with `lib: ["ES2020"]` and `types: []` — the seven-project
// split exists so that "the runtime touches no DOM" is checked rather than
// asserted — and `AbortSignal` is defined in `lib.dom.d.ts` and in
// `@types/node`, in no ES lib at all. Measured here, with this repository's
// own tsc under exactly those options, a file naming it fails with
// `error TS2304: Cannot find name 'AbortSignal'`.
//
// So the type is ASKED OF THE HOST rather than imported. The conditional reads
// `globalThis`: where the host has an `AbortSignal` constructor it resolves to
// that constructor's instance type — the real one — and where it has none it
// falls back to the one member a validator can read without it.
//
// THE FALLBACK IS NOT THE POINT; THE RESOLUTION IS. A plain structural
// interface would compile everywhere and be assignable FROM a real signal but
// not TO one, so an adapter's `fetch(url, { signal })` — the single thing the
// signal exists to be handed to — would need a cast at every call. Verified
// under `lib: ["ES2020", "DOM"]`: a program that passes this type straight to
// `fetch` and assigns a real `AbortSignal` to it compiles with no cast, while
// the same declaration under `lib: ["ES2020"]`, `types: []` still compiles.
//
// Nothing in this package ever constructs one. The runtime reaches
// `AbortController` off `globalThis` the way `warn-unaddressable.ts` reaches
// `console`, and only for an adapter that asked for a signal — so a host with
// neither is still a host this runtime loads in.
// ===========================================================================

/**
 * What a validator can still read where the host has no `AbortSignal`.
 *
 * One member, because a polling read is the only thing that works without the
 * event target the real signal is. An adapter that wants `addEventListener`
 * wants the real signal, and on a host that has one this type is never used.
 */
export interface PollableAbortSignal {
  readonly aborted: boolean;
}

/**
 * The host's `AbortSignal` where there is one, and a readable `aborted` flag
 * where there is not. See this file's header for why it is spelled this way.
 */
export type ValidationSignal =
  typeof globalThis extends {
    AbortSignal: abstract new (...args: never) => infer S;
  }
    ? S
    : PollableAbortSignal;
