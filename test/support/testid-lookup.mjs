// Addressing a rendered node by its `data-testid`, written once.
//
// A helper this small earns a module by being retyped, not by being hard: it
// stood in four copies in two quoting styles, two of them inside this very
// directory. `JSON.stringify` is the part worth not retyping — an unquoted
// attribute value has to be a bare CSS identifier, and a probe on jsdom 26.1.0
// gave SyntaxError for `[data-testid=a b]` where the quoted form matched. The
// ids here are field paths, so brackets and dots arrive in them by
// construction — auto-form.test.mjs looks up `w-items[0].sku` — and any of
// the four copies written without the quoting would have thrown rather than
// returned null. That is the good failure, but only for whoever ran it.
export const find = (container, testId) =>
  container.querySelector("[data-testid=" + JSON.stringify(testId) + "]");
