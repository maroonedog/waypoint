// ===========================================================================
// issue-visibility-context.ts — the default answer for a subtree.
//
// IT IS A CONTEXT AND NOT A `FormOptions` MEMBER, and the reason is which
// layer the question belongs to. When a pass runs is a fact about the form and
// lives in `./core`. When a field SHOWS what the pass found is a fact about
// the screen: the same form drawn as a settings page and as a wizard step
// wants different answers, and `./core` has no screen and no opinion about
// one. Putting it in the options would have given the core entry its first
// display policy.
//
// So the default arrives the way every other screen-shaped default does, and
// a subtree can override it without the form knowing — which is also what
// makes `useField`'s own option a genuine override rather than an argument
// that has to agree with something written elsewhere.
//
// The context default is `"immediately"`, which is what this library did
// before any of this existed: an application that sets nothing sees no change.
// ===========================================================================
// The default itself is in `../dom`, beside the rule that reads it, because
// the second binding's provider needs the same one. Re-exported here, and from
// `./react`, under the spelling it has always had.
import { createContext } from "react";
import {
  DEFAULT_ISSUE_VISIBILITY,
  type IssueVisibility,
} from "../dom/issue-visibility.js";

export { DEFAULT_ISSUE_VISIBILITY };

export const IssueVisibilityContext = createContext<IssueVisibility>(
  DEFAULT_ISSUE_VISIBILITY
);
