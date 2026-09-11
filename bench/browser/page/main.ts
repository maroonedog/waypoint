// ===========================================================================
// main.ts — the page entry.
//
// It installs the API and then does nothing. Every decision about what to
// mount, how long to warm and when to type is the driver's, so that a page
// reload cannot quietly change the experiment.
// ===========================================================================
import { installBenchApi } from "./bench-api.ts";

installBenchApi();
document.title = "form bench — ready";
