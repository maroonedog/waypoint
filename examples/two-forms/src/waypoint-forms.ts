// ===========================================================================
// waypoint-forms.ts — both of this application's forms, declared once.
//
// TWO MEMBERS, AND THE MEMBER NAME IS THE PREFIX. `customer` and `admin` here
// are what `customer:owner.email` and `admin:quotas.seats` are checked
// against. Register a third and its name becomes legal in a path with no other
// change anywhere.
//
// With more than one registered, an UNQUALIFIED path stops compiling. That is
// deliberate: `owner.email` exists in both of these and means different things
// in each, so there is no answer a runtime could pick that would not be wrong
// half the time. The compiler asks instead of guessing.
// ===========================================================================
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { adminSchema, customerSchema } from "./schema.js";

const customerAdapter = zodFormResolver(customerSchema);
const adminAdapter = zodFormResolver(adminSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    customer: typeof customerAdapter;
    admin: typeof adminAdapter;
  }
}

export { customerAdapter, adminAdapter };
