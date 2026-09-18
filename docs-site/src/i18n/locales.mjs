// ===========================================================================
// locales.mjs — which routes exist in Japanese, said once.
//
// TWO THINGS READ THIS AND THEY MUST NOT DISAGREE: the layout, which decides
// whether to emit an `hreflang` pair on the page, and the sitemap, which
// decides whether to list the two URLs as one page in two languages. They were
// separately correct and jointly wrong for a while — the sitemap claimed a
// Japanese alternate for all ten routes because `@astrojs/sitemap` assumes
// every locale has every page, while the pages themselves only claimed it for
// two. A search engine would have taken the sitemap's word for it and served a
// Japanese reader a page that is a summary and a link.
//
// `.mjs` RATHER THAN `.ts`, because `astro.config.mjs` is one of the two
// readers and a config is loaded before anything type-checks the project.
//
// A ROUTE JOINS THIS LIST WHEN ITS PAGE IS WRITTEN, and leaves
// `untranslated.ts` at the same time. Those two edits are one change; nothing
// enforces it, so they are next to each other in the same directory.
//
// A ROUTE IS NOT A PATHNAME HERE. A route is what the site calls a page —
// `/api/`, the same string in both languages. A pathname is what the browser
// is on, and it carries two prefixes a route does not: the deployment's base
// and the locale. Everything below converts between the two, in one place,
// because a link that forgets either one is a 404 that only appears once the
// site is deployed.
// ===========================================================================

/** Routes with a hand-written Japanese page. Everything else is English. */
export const TRANSLATED = ["/", "/start/", "/details/"];

// THE SITE IS SERVED FROM A SUBDIRECTORY, because a GitHub Pages project site
// is published under /<repository>/ and not at the root of the host. Astro is
// told this as `base` in astro.config.mjs, which makes ASTRO's output carry it
// — the stylesheet and script tags it emits, and the sitemap's URLs. A
// hand-written `href="/api/"` is not Astro's output: it resolves against the
// host and lands outside the site. So hand-written links go through
// `servedPath`, and anything reading `Astro.url.pathname` goes through
// `routeOf`, which takes the prefix back off.
/** The path this site is served under, with no trailing slash. */
export const BASE = "/waypoint";

/** A pathname with the base taken off: `/waypoint/ja/api/` is `/ja/api/`. */
const withoutBase = (pathname) => {
  if (pathname === BASE) return "/";
  return pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname;
};

/** The locale a pathname belongs to. */
export const localeOf = (pathname) => {
  const path = withoutBase(pathname);
  return path === "/ja" || path.startsWith("/ja/") ? "ja" : "en";
};

/** The route a pathname is on: `/waypoint/ja/api/` is `/api/`. */
export const routeOf = (pathname) => {
  const path = withoutBase(pathname);
  return localeOf(path) === "ja" ? path.replace(/^\/ja/, "") || "/" : path;
};

/** The pathname a route is served at: `/api/` is `/waypoint/api/`. */
export const servedPath = (route) => (route === "/" ? `${BASE}/` : `${BASE}${route}`);
