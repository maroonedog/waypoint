// ===========================================================================
// waypoint-forms.ts — this application's form, declared once.
//
// One entry, because a wizard is one form. Nothing imports this file: a module
// augmentation belongs to the COMPILATION rather than to the import graph.
// ===========================================================================
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { bookingSchema } from "./schema.js";

const bookingAdapter = zodFormResolver(bookingSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    form: typeof bookingAdapter;
  }
}

export { bookingAdapter };
