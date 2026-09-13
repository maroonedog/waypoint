// ===========================================================================
// waypoint-forms.ts — this application's form, declared once.
//
// Nothing imports this file. A module augmentation belongs to the COMPILATION,
// not to the import graph, so every component below is checked against these
// paths without receiving anything or knowing this file exists.
// ===========================================================================
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { orderSchema } from "./schema.js";

const orderAdapter = zodFormResolver(orderSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    form: typeof orderAdapter;
  }
}

export { orderAdapter };
