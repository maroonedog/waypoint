// ===========================================================================
// parse-qualified-path.ts — the colon, split in one place.
//
// A qualified path names a form and a place in it: `admin:quotas.seats`. The
// hooks that address a field take one, and this is where the two halves come
// apart — the ones that address a FORM take a key instead, and `useCell` and
// `useCreateForm` take neither.
// Below here nothing ever sees a prefix: `./core` addresses a VALUE with a
// path, and the concrete-path grammar has no case for a colon — a prefix that
// reached it would be read as part of the first member's NAME and quietly
// address something that does not exist, rather than failing. One door, and
// the corruption has nowhere to enter by.
//
// WHERE THE PREFIX ENDS is decided lexically: a head qualifies the path only
// when it stands before the first `.` or `[`. Splitting on the first colon
// instead would steal a record key that contains one — `byId.a:b.amount` is a
// path — and this rule leaves it alone, because the first `.` comes first.
//
// The rule is lexical so that both sides can apply it. There is no list of
// registered forms here — only the one key the enclosing provider carries — so
// "is this head registered?" is a question this side cannot ask, and a rule
// built on it would leave the types and the runtime disagreeing about which
// strings are qualified at all. waypoint-forms.ts asks the same lexical
// question of the path union.
//
// A HEAD THAT NAMES ANOTHER FORM THROWS. It cannot route to that form instead:
// one context holds one handle, and providers nest by shadowing, so there is
// nothing here to look a foreign key up in. Throwing is also the first time
// that guard has been reachable — it was only ever asked of a call that passed
// a key as a separate argument, and a call that passed none handed it
// `undefined` and skipped it.
//
// NO HEAD MEANS THE ENCLOSING FORM, and it does not throw. There is exactly
// one provider in reach, so the string is unambiguous here even where the
// types refuse it; the ambiguity the prefix removes is a compile-time one. It
// also has to stay legal for the `string`-typed adapter that form-type-
// registry.ts documents as the escape for a schema built at run time — those
// paths are built from data and have no literal to put a prefix on.
// ===========================================================================

/** Where a qualifying head may stop. A colon after either of these is a name. */
const PATH_STEP = /[.[]/;

const headOf = (spelling: string): string | undefined => {
  const colon = spelling.indexOf(":");
  if (colon === -1) return undefined;
  const head = spelling.slice(0, colon);
  return PATH_STEP.test(head) ? undefined : head;
};

/**
 * The place the enclosing form is asked for.
 *
 * @throws when the path names a form the enclosing provider is not.
 */
export const formPathWithin = (
  spelling: string,
  enclosingKey: string
): string => {
  const head = headOf(spelling);
  if (head === undefined) return spelling;
  if (head !== enclosingKey) {
    throw new Error(
      `"${spelling}" names the "${head}" form, but the enclosing ` +
        `<FormProvider> carries "${enclosingKey}".`
    );
  }
  return spelling.slice(head.length + 1);
};

/** The form a qualified path names, or the enclosing one when it names none. */
export const formKeyOf = (spelling: string, enclosingKey: string): string =>
  headOf(spelling) ?? enclosingKey;
