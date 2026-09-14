// ===========================================================================
// waypoint-forms.ts — this application's one form, declared once.
//
// `auto` is the prefix every path in this example carries. The name is this
// application's, not the library's, and it is why two screens here can draw
// the same form while the documentation site runs five other forms in the same
// compilation.
// ===========================================================================
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { orderSchema } from "./schema.js";

export const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    auto: typeof orderAdapter;
  }
}
