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
// ===========================================================================

/** Routes with a hand-written Japanese page. Everything else is English. */
export const TRANSLATED = ["/", "/start/"];

/** The locale a pathname belongs to. */
export const localeOf = (pathname) =>
  pathname === "/ja" || pathname.startsWith("/ja/") ? "ja" : "en";

/** The pathname with the locale prefix taken off: `/ja/api/` is `/api/`. */
export const routeOf = (pathname) =>
  localeOf(pathname) === "ja" ? pathname.replace(/^\/ja/, "") || "/" : pathname;
