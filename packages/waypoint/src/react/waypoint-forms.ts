// ===========================================================================
// waypoint-forms.ts — which forms this application has, stated once.
//
// One React context object serves every form in the application, so the
// context cannot be generic and a path union cannot travel through it. The
// answer is that the types do not travel at all. The application declares them
// once in its own source, and every hook reads them from here — so a component
// ten levels down imports nothing, receives nothing, and is still checked.
//
//   declare module "@maroonedog/waypoint/react" {
//     interface WaypointForms {
//       form: typeof orderAdapter;
//     }
//   }
//
// THE NAME SAYS WHOSE IT IS, and it is the one exported name here that has to.
// Every other type this entry exports arrives through an `import` line that
// already names the package. This one is written by an application that
// imports nothing, inside a `declare module` block — and it is what the
// registration error quotes and what somebody greps for afterwards. A reader
// shown only the inner line, in a diff or a snippet or a codebase part-way
// through a migration with two form libraries in it, can tell from
// `WaypointForms` which library is being spoken to. A name any form library
// might plausibly have chosen leaves them to guess.
//
// A PATH CARRIES ITS FORM: `useField("admin:quotas.seats")`. The colon
// separates the registered key from the path within that form, and that is
// what lets every path-taking surface in the package name a form without
// growing a parameter for one. A component prop, a `<Field path>`, a
// `FormPathTo<string>` and a row's own `row.path` are all one string, and all
// of them say which form they belong to.
//
// WHAT THE PREFIX BUYS, exactly. A call that named no key used to be checked
// against EVERY registered form at once, so it accepted every registered
// form's paths while only one form's were right where it stood. Qualified, the
// union names a form in every member, so a path belonging to another form says
// so where it is written, and the provider-key comparison in
// parse-qualified-path.ts has a name to compare.
//
// AN UNPREFIXED PATH IS STILL LEGAL WHEN EXACTLY ONE FORM IS REGISTERED, and
// that is `SoleFormKey`'s whole job. An application with one form should not
// have to write its name in front of every path it owns. Register a second and
// `SoleFormKey` is `never`, the unprefixed spellings leave the union, and the
// application is told at every call site rather than at one.
//
// WHERE THE PREFIX ENDS is a LEXICAL question, not a search for the first
// colon: a head qualifies a path only when it stands before the first `.` or
// `[`. `Record<string, T>` puts `${string}` into the path grammar and a record
// key may contain a colon, so `byId.a:b.amount` has to stay a path — and under
// this rule it does, because the first `.` comes first.
//
// IT IS LEXICAL BECAUSE THE RUNTIME HAS TO BE ABLE TO RUN IT. A rule that
// asked "is this head a REGISTERED key?" is answerable here and nowhere else:
// the registry exists only in type positions, and running code has one
// enclosing provider rather than a list of forms. A question only one side can
// answer puts the two sides' idea of which strings are qualified out of step,
// and that gap is where the checked spelling becomes the one that throws.
// parse-qualified-path.ts answers the same question at run time.
//
// Several forms are several keys, and the key is named inside the path.
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
//
// THE SECOND HALF OF THAT GUARANTEE IS `InhabitedFormPath`'S EMPTY-REGISTRY
// BRANCH. The refusal above is carried by a MESSAGE rather than by `never`, so
// that TypeScript quotes it; intersecting an inhabitation test into the
// parameter beside it collapses the whole parameter to `never`, and then the
// message is refused against and never shown. So when nothing is registered
// the inhabitation test steps aside and lets the message be what the call is
// refused against. The registry is the only place that knows the registry is
// empty, which is why this branch is here rather than in `InhabitedPath`,
// which knows nothing about forms.
// ===========================================================================
import type {
  ConcretePath,
  DeclaredOf,
  FormAdapter,
  InhabitedPath,
  PartlyBoundPath,
  ValueAtPath,
} from "../contract/index.js";

/** Augmented by the application. Empty here, on purpose. */
export interface WaypointForms {}

/**
 * What an unregistered lookup resolves to.
 *
 * A message rather than `never`, because TypeScript quotes it verbatim in the
 * error — "is not assignable to parameter of type '<this>'" — and that quote
 * is the only thing the reader has to go on. `never` would refuse the call
 * just as firmly and explain nothing.
 *
 * It names the path SPELLING as well as the declaration, because registration
 * and spelling are now one fact: after the reader copies the declaration, the
 * next thing they need is how to write a path against it, and this string is
 * where they are standing when they need it.
 */
type NoRegistration =
  'No form type is registered. Add: declare module "@maroonedog/waypoint/react" { interface WaypointForms { form: typeof yourAdapter } } — then a path is spelled "form:owner.email".';

/**
 * Every key the application registered.
 *
 * `& string` because a key is written into a path — `"admin:quotas.seats"` —
 * and a symbol cannot be. It also lets a key be passed straight to the runtime
 * seams that compare one, with nothing asserted on the way.
 */
export type FormKey = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : keyof WaypointForms & string;

type AdapterFor<TKey> = TKey extends keyof WaypointForms
  ? WaypointForms[TKey]
  : never;

// Naked parameters. Both so a union of adapters distributes instead of being
// inferred against as one type, and so `never` stays `never` — see above.
type PathsOfAdapter<A> = A extends FormAdapter<unknown, infer P> ? P : never;
type ValuesOfAdapter<A> = A extends FormAdapter<infer T, string> ? T : never;
type CodesOfAdapter<A> = A extends FormAdapter<unknown, string, infer C>
  ? C
  : never;

/** The paths one registered form declares. */
export type PathsFor<TKey> = [AdapterFor<TKey>] extends [never]
  ? NoRegistration
  : PathsOfAdapter<AdapterFor<TKey>>;

/** The value type one registered form was built for. */
export type ValuesFor<TKey> = ValuesOfAdapter<AdapterFor<TKey>>;

/**
 * The issue codes one registered form's validator can produce.
 *
 * `never` FOR TWO DIFFERENT REASONS, and a caller sees the same thing either
 * way — which is correct in both. A form registered against
 * `standardFormResolver` declares `never` because the spec's issue has no
 * code member at all; a key that is not registered resolves to `never`
 * because there is no adapter to ask. In both cases a wording function
 * matching on `issue.code` is matching something that cannot arrive, and the
 * compiler says so rather than the branch being silently dead.
 */
export type CodesFor<TKey> = CodesOfAdapter<AdapterFor<TKey>>;

/** Every code any registered form can produce. */
export type AnyCode = CodesFor<keyof WaypointForms>;

/** The codes the form a qualified path names can produce. */
export type CodesAtFormPath<Q extends string> = CodesFor<FormKeyOfPath<Q>>;

/** Every path any registered form declares, with no form attached to it. */
export type AnyPath = PathsFor<keyof WaypointForms>;

/** Every registered form's value type. */
export type AnyValues = ValuesFor<keyof WaypointForms>;

/**
 * The declared type at a path, over one form or over all of them.
 *
 * Distributed by hand: ValueAtPath tests the PATH in its first conditional, so
 * a union of value types would be walked as a single object and collapse.
 */
export type ValueOfPath<TValues, P extends string> = TValues extends unknown
  ? ValueAtPath<TValues, P>
  : never;

type UnionToIntersection<U> = (
  U extends unknown ? (contributed: U) => void : never
) extends (merged: infer I) => void
  ? I
  : never;

/**
 * The one registered key when there is exactly one, and `never` when there are
 * several — which is what decides whether an unprefixed path is legal.
 *
 * Decided by intersection, because that is the question asked backwards: one
 * literal intersected with itself is still that literal, and two disjoint
 * string literals intersect to `never`. The empty registry has to be answered
 * FIRST: intersecting nothing yields `unknown`, and an `unknown` key here
 * would put an unprefixed spelling of every path back into the union.
 */
type SoleFormKey = [keyof WaypointForms] extends [never]
  ? never
  : UnionToIntersection<keyof WaypointForms> extends infer Only
    ? Only extends keyof WaypointForms
      ? Only
      : never
    : never;

// Naked, so each answers `never` for `never` and distributes over a union of
// keys. They reach the adapter through `AdapterFor` rather than through
// `PathsFor`, and that is load-bearing: `PathsFor` answers with the
// NoRegistration MESSAGE for a key that is not registered, and a message
// spliced into a template literal is an ordinary string — it would make the
// sentence itself a legal path prefix.
type RulesOf<TKey> = PathsOfAdapter<AdapterFor<TKey>>;
type PlacesOf<TKey> = ConcretePath<PathsOfAdapter<AdapterFor<TKey>>>;
type ColumnsOf<TKey> = PartlyBoundPath<PathsOfAdapter<AdapterFor<TKey>>>;
type ListsOf<TKey> = ConcretePath<ArrayPath<PathsOfAdapter<AdapterFor<TKey>>>>;

/**
 * A path that may be written with no form in front of it.
 *
 * WHAT IT REMOVES, and this is the one place the compiler and the runtime
 * could have disagreed. The runtime has no list of registered keys — it has
 * one enclosing provider — so it cannot ask "is this head a key?". It can only
 * ask "does a colon-terminated head stand before the first `.` or `[`?", and
 * throw when that head is not the provider's. So a root member NAMED with a
 * colon would compile unprefixed here and throw there, which is the defect
 * shape this package keeps finding: the checked spelling being the broken one.
 * Such a member leaves the unprefixed arm and is reached by qualifying it —
 * `form:a:b` — which both sides read the same way.
 *
 * A colon anywhere else is untouched, so a `Record<string, T>` key containing
 * one is still an ordinary path: in `byId.a:b.amount` the first `.` comes
 * first, so there is no head to mistake for a form.
 */
type WithoutFormKeyHead<P> = P extends `${infer Head}:${string}`
  ? Head extends `${string}.${string}` | `${string}[${string}]`
    ? P
    : never
  : P;

type QualifiedPlace<TKey> = TKey extends keyof WaypointForms
  ? `${TKey & string}:${PlacesOf<TKey>}`
  : never;
type QualifiedColumn<TKey> = TKey extends keyof WaypointForms
  ? `${TKey & string}:${ColumnsOf<TKey>}`
  : never;
type QualifiedList<TKey> = TKey extends keyof WaypointForms
  ? `${TKey & string}:${ListsOf<TKey>}`
  : never;
type QualifiedRule<TKey> = TKey extends keyof WaypointForms
  ? `${TKey & string}:${RulesOf<TKey>}`
  : never;

/**
 * Any PLACE any registered form has, qualified by the form it belongs to —
 * the type a VIEW component's `path` prop takes, in an application that
 * registered one. A component drawing one field for whatever path it is handed
 * belongs to the design system rather than to a form, and this says so without
 * giving up on checking what it is handed; qualified, the prop also says WHICH
 * form each path came from, which a keyless union cannot.
 *
 * IN A PACKAGE OF ITS OWN it says nothing, because a registry belongs to a
 * COMPILATION and that package's has none: this resolves to the
 * no-registration message there, and the component cannot be type-checked
 * until it is compiled inside an application that registers. Publishing such a
 * component with its paths checked is not solved.
 *
 * A place and not a rule, because that is what such a component does with it:
 * it hands it to `useField`, which addresses one value. A row's own
 * `` `${row.path}.sku` `` is a place, and it is already qualified because
 * `row.path` is.
 *
 * WRAPPED IN AN OUTER TEMPLATE LITERAL, and that is not cosmetic. A type alias
 * whose right-hand side is a union keeps its alias symbol, and TypeScript then
 * prints the alias NAME in the error instead of the alternatives — which
 * defeats the one thing a path union is for. The wrapper makes it a template
 * literal type, and those are elaborated.
 */
export type FormPath = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : `${QualifiedPlace<keyof WaypointForms> | WithoutFormKeyHead<PlacesOf<SoleFormKey>>}`;

/**
 * Any COLUMN any registered form has, qualified — every `[*]` independently
 * kept or bound, which is WIDER than a place rather than narrower.
 *
 * This is what a wildcard read takes. `admin:items[*].sku` names every sku the
 * list holds, and `admin:shipments[0].lines[*].sku` names one shipment's.
 */
export type FormColumnPath = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : `${QualifiedColumn<keyof WaypointForms> | WithoutFormKeyHead<ColumnsOf<SoleFormKey>>}`;

/**
 * Any LIST any registered form has, qualified. A list is declared as
 * `items[*]`, so the lists are what is left when that suffix is removed, and a
 * list nested in a row is reached through its outer row's concrete index.
 */
export type FormListPath = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : `${QualifiedList<keyof WaypointForms> | WithoutFormKeyHead<ListsOf<SoleFormKey>>}`;

/**
 * Any DECLARED path any registered form has, qualified — the rule, with every
 * `[*]` still standing.
 *
 * A descriptor is keyed by the rule, so this is what names an entry in the
 * descriptor tree: a whole list is `form:items[*]` and not one row of it. It
 * is what a caller picking declarations out of a form takes, where a place
 * union would refuse the only spelling that means "the list itself".
 */
export type FormDeclaredPath = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : `${
      | QualifiedRule<keyof WaypointForms>
      | WithoutFormKeyHead<RulesOf<SoleFormKey>>}`;

/**
 * Which form a qualified path names.
 *
 * The head is taken as a key only when it IS one; otherwise the whole string
 * is a path in the sole registered form. That is also what keeps a record key
 * containing a colon a path rather than a qualification.
 */
export type FormKeyOfPath<Q extends string> =
  Q extends `${infer Head}:${string}`
    ? Head extends keyof WaypointForms
      ? Head
      : SoleFormKey
    : SoleFormKey;

/** The path within that form: what `./core` is handed, and all it ever sees. */
export type FormLocalPath<Q extends string> =
  Q extends `${infer Head}:${infer Rest}`
    ? Head extends keyof WaypointForms
      ? Rest
      : Q
    : Q;

/** The value type of the form a qualified path names. */
export type ValuesAtFormPath<Q extends string> = ValuesFor<FormKeyOfPath<Q>>;

/** The declared type at a qualified path, read in its own form's value type. */
export type ValueAtFormPath<Q extends string> = ValueOfPath<
  ValuesAtFormPath<Q>,
  DeclaredOf<FormLocalPath<Q>>
>;

/**
 * `Q` when its form has a value at it, and `never` when it does not.
 *
 * Intersected into a path parameter beside the union constraint, for the
 * reason inhabited-path.types.ts gives: a member typed `Record<string, T>`
 * widens the union to a template that absorbs everything below it, so the
 * union stops checking there and this narrows the parameter instead.
 *
 * The empty registry steps aside — see the header.
 */
export type InhabitedFormPath<Q extends string> = [
  keyof WaypointForms,
] extends [never]
  ? Q
  : [InhabitedPath<ValuesAtFormPath<Q>, FormLocalPath<Q>>] extends [never]
    ? never
    : Q;

/**
 * The qualified places of the forms `TKey` names — every form's when it names
 * them all. What the two filters below are computed over.
 */
type FormPathsOf<TKey> = [keyof WaypointForms] extends [never]
  ? NoRegistration
  : [TKey] extends [keyof WaypointForms]
    ? `${
        | QualifiedPlace<TKey>
        | (TKey extends SoleFormKey ? WithoutFormKeyHead<PlacesOf<TKey>> : never)}`
    : never;

/** Naked, so the union of paths is filtered one member at a time. */
type PathToValue<Q, TValue> = Q extends string
  ? [ValueAtFormPath<Q>] extends [TValue | undefined]
    ? Q
    : never
  : never;

/**
 * The registered paths whose value is a `TValue` — `FormPathTo<string>` for a
 * text input, `FormPathTo<number>` for a stepper. Name a form as the second
 * argument to take that form's paths and no other's.
 *
 * `FormPath` alone includes the CONTAINERS, because reading a whole object or
 * a whole list is an ordinary thing to want. A component that puts what it
 * reads into an `<input value>` does not want them, and saying which values it
 * can draw is how it says so — rather than taking every path and coercing
 * whatever arrives.
 *
 * THE VALUE IS READ IN THE FORM THE PATH NAMES, which is a question the
 * unqualified spelling could not ask. Over a keyless union the most it could
 * ask was whether the value is a `TValue` in ANY registered form, so a path
 * whose own form declares something else there still passed the filter.
 */
export type FormPathTo<TValue, TKey = keyof WaypointForms> = PathToValue<
  FormPathsOf<TKey>,
  TValue
>;

/** Naked, so the union of paths is filtered one member at a time. */
type PathOver<Q, TLeaf extends string> = Q extends string
  ? [`${Q}.${TLeaf}`] extends [FormPath]
    ? Q
    : never
  : never;

/**
 * The registered paths that have all of `TLeaf` under them — the type of a
 * section component's `at` prop. Name a form as the second argument to take
 * that form's paths and no other's.
 *
 * A section placed twice (an address under `billing` and under `shipping`) is
 * told WHERE by a prop, and this is how that prop stays checked: the union of
 * the places where the whole section fits, computed rather than listed, so a
 * schema that grows a third address needs no edit here.
 *
 * The prefix sits on the LEFT, so appending the leaf still spells a member of
 * the qualified union: `admin:billing` plus `.postcode` is
 * `admin:billing.postcode`.
 */
export type FormPathOver<
  TLeaf extends string,
  TKey = keyof WaypointForms,
> = PathOver<FormPathsOf<TKey>, TLeaf>;

/**
 * The array paths: a list is declared as `items[*]`, so the lists are what is
 * left when that suffix is removed.
 */
export type ArrayPath<P extends string> = P extends `${infer Base}[*]`
  ? Base
  : never;
