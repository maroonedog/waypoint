// ===========================================================================
// describe-browser.ts — the build the microseconds came out of.
//
// A count does not depend on the browser. Every figure in this lane does, so
// the build string, the protocol version, the headless flag, the device scale,
// the observed refresh rate and the CPU throttle are recorded automatically
// rather than left to whoever writes the commit message.
//
// The refresh rate is TAKEN, not read from a display API: the lane paces its
// interactions on presented frames, so what matters is the rate this page
// actually gets, which under headless is frequently not the panel's.
// ===========================================================================
import type { Page } from "playwright-core";

export interface BrowserDescription {
  readonly product: string;
  readonly revision: string;
  readonly jsVersion: string;
  readonly protocolVersion: string;
  readonly userAgent: string;
  readonly headless: boolean;
  readonly flags: readonly string[];
  readonly devicePixelRatio: number;
  readonly observedRefreshHz: number;
  readonly cpuThrottleRate: number;
  readonly crossOriginIsolated: boolean;
  readonly clockTickMicroseconds: number;
  readonly hardwareConcurrency: number;
}

const observeRefreshHz = async (page: Page): Promise<number> =>
  page.evaluate(async () => {
    const stamps: number[] = [];
    await new Promise<void>((resolve) => {
      const tick = (at: number): void => {
        stamps.push(at);
        if (stamps.length < 31) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    const gaps = stamps.slice(1).map((at, index) => at - (stamps[index] ?? 0));
    gaps.sort((one, other) => one - other);
    const middle = gaps[Math.floor(gaps.length / 2)] ?? 0;
    return middle > 0 ? Math.round(1000 / middle) : 0;
  });

export async function describeBrowser(
  page: Page,
  launch: { readonly headless: boolean; readonly flags: readonly string[] }
): Promise<BrowserDescription> {
  const client = await page.context().newCDPSession(page);
  const version = (await client.send("Browser.getVersion")) as {
    product: string;
    revision: string;
    jsVersion: string;
    protocolVersion: string;
    userAgent: string;
  };
  await client.detach();

  const facts = await page.evaluate(() => {
    const api = window.__bench;
    if (api === undefined) throw new Error("the page never installed __bench");
    return api.facts();
  });

  return {
    product: version.product,
    revision: version.revision,
    jsVersion: version.jsVersion,
    protocolVersion: version.protocolVersion,
    userAgent: facts.userAgent,
    headless: launch.headless,
    flags: launch.flags,
    devicePixelRatio: facts.devicePixelRatio,
    observedRefreshHz: await observeRefreshHz(page),
    cpuThrottleRate: 1,
    crossOriginIsolated: facts.crossOriginIsolated,
    clockTickMicroseconds: facts.clockTickMicroseconds,
    hardwareConcurrency: facts.hardwareConcurrency,
  };
}
