// ===========================================================================
// open-subject-page.ts — one origin, one renderer, one page that stays open.
//
// A lane is opened once and reused, because reloading between samples would
// put a fresh compile of the whole bundle inside every measurement and make
// the numbers a report on vite's output rather than on the runtimes.
//
// The schema is warmed HERE, by the oracle, before any subject is mounted on
// this lane. Whoever went first would otherwise pay for zod's lazy
// initialisation and every later subject would ride free on it — a per-run
// ordering artefact that looks exactly like a slow library.
// ===========================================================================
import type { Browser, Page } from "playwright-core";
import type { InjectionPosition } from "./page/bench-api.types.ts";

export interface Lane {
  readonly name: string;
  readonly origin: string;
  readonly page: Page;
}

export interface Side {
  readonly label: string;
  readonly subjectId: string;
  readonly cost?: { readonly milliseconds: number; readonly position: InjectionPosition };
}

export async function openLane(
  browser: Browser,
  name: string,
  origin: string
): Promise<Lane> {
  const page = await browser.newPage();
  await page.goto(`${origin}/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__bench !== undefined);

  const isolated = await page.evaluate(() => window.__bench!.facts().crossOriginIsolated);
  if (!isolated) {
    throw new Error(
      `${origin} is not crossOriginIsolated; performance.now() is coarsened ` +
        "to about 100 µs there and no microsecond from it would mean anything"
    );
  }

  await page.evaluate(() => {
    for (const shape of window.__bench!.shapes()) window.__bench!.warmSchema(shape.id);
  });
  return { name, origin, page };
}

/** Mounts a side and warms it. The injected cost is in place before the warm. */
export async function prepare(
  lane: Lane,
  side: Side,
  shapeId: string,
  warmMilliseconds: number
): Promise<number> {
  await lane.page.evaluate(
    async ([subjectId, shape]) => {
      window.__bench!.clearInjectedCost();
      await window.__bench!.mount(subjectId!, shape!);
    },
    [side.subjectId, shapeId]
  );
  if (side.cost !== undefined && side.cost.milliseconds > 0) {
    await lane.page.evaluate(
      ([milliseconds, position]) =>
        window.__bench!.injectCost(
          milliseconds as number,
          position as InjectionPosition
        ),
      [side.cost.milliseconds, side.cost.position] as [number, string]
    );
  }
  await lane.page.evaluate((ms) => window.__bench!.warm(ms), warmMilliseconds);
  return lane.page.evaluate(() => window.__bench!.renderedLeaves());
}
