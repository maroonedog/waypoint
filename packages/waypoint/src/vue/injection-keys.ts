// ===========================================================================
// injection-keys.ts — what `<FormProvider>` puts in reach of a subtree.
//
// React needs five `createContext` objects and five nested providers around
// every form. Vue needs five keys and five `provide()` calls in ONE setup, so
// the tree gains no component at all for carrying them — which is why the
// React provider argues about whether a fiber is worth rendering and this one
// does not have that argument to have.
//
// A `Symbol` rather than a string, so an application providing its own value
// under the name "form" cannot be mistaken for this one, and `InjectionKey<T>`
// so that `inject` hands back the type without the caller naming it.
//
// A VALUE WHERE IT CANNOT MOVE, A GETTER WHERE IT CAN. The handle is created
// once and the key is a name, so those are provided as themselves. The
// visibility and the wording table are props, and `setup()` runs once — a
// screen that reveals its issues after a refused submit, or switches language,
// changes exactly those — so their keys carry a getter and the subtree reads
// through it. The registry is a prop too and is deliberately NOT one: swapping
// the widget table under a mounted form is not a thing this entry offers, and
// a getter would imply it does.
// ===========================================================================
import type { InjectionKey } from "vue";
import type { FormHandle } from "../core/index.js";
import type { AnyFormMessageFor } from "../dom/form-message.js";
import type { IssueVisibility } from "../dom/issue-visibility.js";
import type { WidgetRegistry } from "./widget-registry.types.js";

export const FormInjection: InjectionKey<FormHandle<unknown, string>> = Symbol(
  "waypoint form"
);

/** Which registered form the enclosing provider is. See React's form-key-context.ts. */
export const FormKeyInjection: InjectionKey<string> = Symbol("waypoint form key");

export const WidgetRegistryInjection: InjectionKey<WidgetRegistry> = Symbol(
  "waypoint widgets"
);

/** A getter, because a screen may change it while the provider stays mounted. */
export const IssueVisibilityInjection: InjectionKey<() => IssueVisibility> =
  Symbol("waypoint issue visibility");

/** A getter, for the reason above. */
export const FormMessageInjection: InjectionKey<
  () => AnyFormMessageFor | undefined
> = Symbol("waypoint form message");
