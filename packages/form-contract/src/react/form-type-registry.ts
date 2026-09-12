// ===========================================================================
// form-type-registry.ts — which forms this application has, stated once.
//
// One React context object serves every form in the application, so the
// context cannot be generic and a path union cannot travel through it. The
// answer is that the types do not travel at all. The application declares them
// once in its own source, and every hook reads them from here — so a component
// ten levels down imports nothing, receives nothing, and is still checked.
//
//   declare module "@maroonedog/form-contract/react" {
//     interface FormTypeRegistry {
//       form: typeof orderAdapter;
//     }
//   }
//
// Several forms are several keys, named at the call site. A call that names no
// key is checked against EVERY registered form: that still refuses a
// misspelling, and gives up only on telling two forms apart.
//
// A form whose paths are genuinely unknown until run time — a schema built
// from a response, the benchmark's generated fields — registers an adapter
// typed `string`. `string` has no `[*]` in it to bind, so `ConcretePath<string>`
// is `string` and that form is back to unchecked paths without anything else
// in the package knowing. The escape is one line of the application's own
// registration rather than a second API.
//
// WHAT KEEPS THE UNREGISTERED CASE FROM SILENTLY PASSING, because it is subtle
// and was got wrong once: `PathsOfAdapter` takes a NAKED type parameter, so it
// distributes and answers `never` for `never`. Written inline instead —
// `AdapterFor<TKey> extends FormAdapter<unknown, infer P> ? P : never` — the
// checked type is not naked, so there is no distribution: `never extends …` is
// simply true, `infer P` finds no candidate and falls back to that parameter's
// CONSTRAINT, which is `string`. An application that registered nothing then
// gets the unchecked hooks back and is told nothing. The first draft of this
// file compiled `useField("owner.emial")` clean for exactly that reason.
// ===========================================================================
import type {
  ConcretePath,
  DeclaredOf,
  FormAdapter,
  ValueAtPath,
} from "../contract/index.js";

/** Augmented by the application. Empty here, on purpose. */
export interface FormTypeRegistry {}

/**
 * What an unregistered lookup resolves to.
 *
 * A message rather than `never`, because TypeScript quotes it verbatim in the
 * error — "is not assignable to parameter of type '<this>'" — and that quote
 * is the only thing the reader has to go on. `never` would refuse the call
 * just as firmly and explain nothing.
 */
type NoRegistration =
  'No form type is registered. Add: declare module "@maroonedog/form-contract/react" { interface FormTypeRegistry { form: typeof yourAdapter } }';

/** Every key the application registered. */
export type FormKey = [keyof FormTypeRegistry] extends [never]
  ? NoRegistration
  : keyof FormTypeRegistry;

type AdapterFor<TKey> = TKey extends keyof FormTypeRegistry
  ? FormTypeRegistry[TKey]
  : never;

// Naked parameters. Both so a union of adapters distributes instead of being
// inferred against as one type, and so `never` stays `never` — see above.
type PathsOfAdapter<A> = A extends FormAdapter<unknown, infer P> ? P : never;
type ValuesOfAdapter<A> = A extends FormAdapter<infer T, string> ? T : never;

/** The paths one registered form declares. */
export type PathsFor<TKey> = [AdapterFor<TKey>] extends [never]
  ? NoRegistration
  : PathsOfAdapter<AdapterFor<TKey>>;

/** The value type one registered form was built for. */
export type ValuesFor<TKey> = ValuesOfAdapter<AdapterFor<TKey>>;

/** Every path any registered form declares — what a call naming no key gets. */
export type AnyPath = PathsFor<keyof FormTypeRegistry>;

/** Every registered form's value type. */
export type AnyValues = ValuesFor<keyof FormTypeRegistry>;

/**
 * The declared type at a path, over one form or over all of them.
 *
 * Distributed by hand: ValueAtPath tests the PATH in its first conditional, so
 * a union of value types would be walked as a single object and collapse.
 */
export type ValueOfPath<TValues, P extends string> = TValues extends unknown
  ? ValueAtPath<TValues, P>
  : never;

/**
 * Any PLACE any registered form has — the type a VIEW component's `path` prop
 * takes. A component that draws one field for whatever path it is handed
 * belongs to the design system rather than to a form, and this is how it says
 * so without giving up on checking what it is handed.
 *
 * A place and not a rule, because that is what such a component does with it:
 * it hands it to `useField`, which addresses one value. It used to be the
 * rule-or-place union, so `<Text at="items[*].sku" />` type-checked and threw
 * on the first render. A row's own `` `${row.path}.sku` `` is a place, so the
 * spelling every list already hands down is the one that fits.
 */
export type FormPath = ConcretePath<AnyPath>;

/** Naked, so the union of paths is filtered one member at a time. */
type PathToValue<P, TValue> = P extends string
  ? [ValueOfPath<AnyValues, DeclaredOf<P>>] extends [TValue | undefined]
    ? P
    : never
  : never;

/**
 * The registered paths whose value is a `TValue` — `FormPathTo<string>` for a
 * text input, `FormPathTo<number>` for a stepper.
 *
 * `FormPath` alone includes the CONTAINERS, because reading a whole object or
 * a whole list is an ordinary thing to want. A component that puts what it
 * reads into an `<input value>` does not want them, and saying which values it
 * can draw is how it says so — rather than taking every path and coercing
 * whatever arrives.
 */
export type FormPathTo<TValue> = PathToValue<FormPath, TValue>;

/** Naked, so the union of paths is filtered one member at a time. */
type PathOver<P, TLeaf extends string> = P extends string
  ? [`${P}.${TLeaf}`] extends [FormPath]
    ? P
    : never
  : never;

/**
 * The registered paths that have all of `TLeaf` under them — the type of a
 * section component's `at` prop.
 *
 * A section placed twice (an address under `billing` and under `shipping`) is
 * told WHERE by a prop, and this is how that prop stays checked: the union of
 * the places where the whole section fits, computed rather than listed, so a
 * schema that grows a third address needs no edit here.
 */
export type FormPathOver<TLeaf extends string> = PathOver<FormPath, TLeaf>;

/**
 * The array paths: a list is declared as `items[*]`, so the lists are what is
 * left when that suffix is removed.
 */
export type ArrayPath<P extends string> = P extends `${infer Base}[*]`
  ? Base
  : never;
