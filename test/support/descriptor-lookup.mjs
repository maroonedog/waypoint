// The two questions you can ask a descriptor list, kept next to each other so
// that asking the second one does not require counting.
//
// A resolver hands back `fields` as a list, and every assertion about that list
// is one of exactly two things: WHICH descriptors exist — which is the question
// that includes their order — or WHAT one of them says. They want different
// tools and they fail for different reasons, and the failure modes are what
// makes this a module. (The resolver files also assert on VERDICTS, which is a
// third question and no business of this file.)
//
// `pathsOf` answers the first. It is deliberately the whole list in one
// assertion: a missing member, an extra one and a reordered one all land on it,
// with a diff a reader can read.
//
// `byPath` answers the second, and the alternative is `fields[2]`. That is not
// a style preference. The day the walk emits members in a different order, an
// index-addressed assertion fails complaining about a constraint or a label,
// under a name that says nothing about ordering — so the reader goes and debugs
// the constraint, which is correct. Looking a descriptor up by the thing that
// identifies it keeps a reorder inside the whole-list assertion, which is the
// only one that can name it.
//
// TWO ASSERTIONS DO STILL USE AN INDEX, and both are left as they were because
// each is safe for a reason that does not generalise. standard-resolver
// .test.mjs:49 reads `adapter.fields[0]` on the line directly below the
// `pathsOf` call that pins the order, and the object it compares against spells
// `path: "owner.name"` inside itself — a reorder fails both, and the one above
// names the reason. file-field.test.mjs:99 reads `.fields[0]` out of a document
// declaring a single property, so there is no second descriptor an index could
// land on.
export const byPath = (fields, path) => fields.find((f) => f.path === path);

export const pathsOf = (adapter) => adapter.fields.map((field) => field.path);
