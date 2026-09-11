// ===========================================================================
// launch-chrome.ts — the locally installed Chrome, driven, not downloaded.
//
// `channel: "chrome"` rather than a bundled build: the number this lane prints
// should be the number the reader's own browser would produce, and a pinned
// download is a browser nobody has. What that costs is reproducibility across
// machines, so `describe-browser.ts` records the exact build beside every
// figure and the lane is printed rather than gated.
//
// The flags are the ones that stop the browser from deciding, mid-run, that a
// headless page nobody is looking at deserves less of the machine. They are
// published with the results; a flag that changes a number and is not printed
// is the same thing as an unpublished knob.
// ===========================================================================
import { chromium, type Browser } from "playwright-core";

export const LAUNCH_FLAGS: readonly string[] = [
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-ipc-flooding-protection",
  "--force-device-scale-factor=1",
  "--hide-scrollbars",
  "--disable-features=CalculateNativeWinOcclusion",
];

export interface LaunchedChrome {
  readonly browser: Browser;
  readonly flags: readonly string[];
  readonly headless: boolean;
}

export async function launchChrome(): Promise<LaunchedChrome> {
  const headless = !process.argv.includes("--headed");
  const browser = await chromium.launch({
    channel: "chrome",
    headless,
    args: [...LAUNCH_FLAGS],
  });
  return { browser, flags: LAUNCH_FLAGS, headless };
}
