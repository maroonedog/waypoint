// ===========================================================================
// fake-api.ts — a server that says things the schema cannot.
//
// It answers in the shape a real endpoint would: either an id, or a list of
// issues each addressed at a path. `FormIssue` is the contract's own type, so
// an endpoint that already speaks it hands its answer straight to
// `adoptIssues` — and one that does not needs a `map` at this boundary and
// nowhere else.
//
// TWO REJECTIONS ON PURPOSE, AND THEY CLEAR AT DIFFERENT MOMENTS.
//
//   `handle`   — a path the schema declares and an input draws. Editing that
//                input drops it, because a write at a path makes a verdict
//                about that path stale. Nobody asks the server again.
//   `payment`  — a path NO descriptor declares and no input draws. Nothing
//                anybody types is about it, so no edit can drop it. It goes
//                when the next submit ends, which is the press that asks the
//                server again.
//
// The second one is the case worth having an example for: it still blocks the
// submit, it is still counted, and it is still named — by `blockedBy` rather
// than by any field.
// ===========================================================================
import type { FormIssue } from "@maroonedog/waypoint";
import type { Signup } from "./schema.js";

export type ApiAnswer =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly issues: readonly FormIssue[] };

const TAKEN = ["ada", "grace", "alan"];

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let accounts = 0;

export async function createAccount(root: Signup): Promise<ApiAnswer> {
  await wait(700);
  const issues: FormIssue[] = [];

  if (TAKEN.includes(root.handle)) {
    issues.push({
      path: "handle",
      message: `"${root.handle}" is taken. Try ${root.handle}_1`,
      code: "handle_taken",
    });
  }
  // A card ending in 0 is declined. The complaint is about the payment, not
  // about the digits typed — so it is not addressed at `card.number`.
  if (root.card.number.endsWith("0")) {
    issues.push({
      path: "payment",
      message: "The card was declined by the issuer",
      code: "card_declined",
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  accounts += 1;
  return { ok: true, id: `acct_${accounts}` };
}
