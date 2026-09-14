// ===========================================================================
// showcase-source.ts — every file behind the screen on /showcase/.
//
// The page ran the form and showed none of its source, which makes a showcase
// a demo: a reader watches it work and still has to take on trust that the
// working was done the way the page says. What a form library is selling is
// what the calling code looks like, so the calling code is the exhibit.
//
// EVERY FILE, and the list below is checked against the directory at build
// time rather than trusted. A file added to the example and forgotten here
// would put the page back where it started — showing most of the source, which
// is the same as showing none of it, because the reader cannot tell which part
// is missing. The check at the foot of this file fails the build instead.
//
// The sources are `?raw` imports of the very files `npm run example:showcase`
// serves and `npm run test:types` compiles, reached through the same relative
// path ShowcaseScreen.tsx uses to run them. There is no copy to drift.
// ===========================================================================

const RAW = {
  ...import.meta.glob("../../../examples/showcase/src/**/*.{ts,tsx,css}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../../../examples/showcase/*.{ts,json,html,md}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

const PREFIX = "../../../examples/showcase/";

/** The languages Code.astro sets, keyed by the extension that picks them. */
const LANGS = {
  ts: "ts",
  tsx: "tsx",
  css: "css",
  html: "html",
  json: "json",
  md: "md",
} as const;

export type SourceLang = (typeof LANGS)[keyof typeof LANGS];

export interface SourceFile {
  /** Path inside `examples/showcase`, which is how the label reads. */
  readonly path: string;
  readonly code: string;
  readonly lang: SourceLang;
  readonly lines: number;
}

export interface SourceGroup {
  readonly title: string;
  /** One sentence on what this group is, and why it is its own group. */
  readonly note: string;
  /**
   * Whether this group's files are unfolded when the page loads.
   *
   * MEASURED, NOT PREFERRED: with all twenty-one files unfolded the document
   * is 39,743px tall, and folding the widgets and the build files brings it
   * to 18,494px. Forty screens of code is not a listing a reader gets past to
   * reach what follows it, and what follows it is how to run the thing.
   *
   * Every file is on the page either way — a folded one is named and counted
   * in the listing, one click from open — so what this changes is the length
   * of the page and not what it shows. The two groups holding every call into
   * the library are the ones that open.
   */
  readonly openByDefault: boolean;
  readonly files: readonly SourceFile[];
}

const file = (path: string): SourceFile => {
  const code = RAW[PREFIX + path];
  if (code === undefined) {
    throw new Error(`showcase-source: no file at examples/showcase/${path}`);
  }
  const ext = path.slice(path.lastIndexOf(".") + 1) as keyof typeof LANGS;
  const lang = LANGS[ext];
  if (lang === undefined) {
    throw new Error(`showcase-source: no language for .${ext}`);
  }
  // Trailing newline dropped: Shiki renders it as an empty last line, and a
  // blank row under the last statement reads as a file that got cut off.
  const trimmed = code.replace(/\n+$/, "");
  return { path, code: trimmed, lang, lines: trimmed.split("\n").length };
};

// THE ORDER IS THE READING ORDER, not the directory's. A reader who opens
// these top to bottom meets the schema, then the registration that turns it
// into paths, then the form that writes those paths, then the widgets that
// know nothing about any of it.
export const SOURCE: readonly SourceGroup[] = [
  {
    title: "The contract",
    note: "The form's shape, and the one declaration that makes its paths exist for the compiler.",
    openByDefault: true,
    files: [
      file("src/schema.ts"),
      file("src/waypoint-forms.ts"),
      file("src/regions.ts"),
    ],
  },
  {
    title: "The form",
    note: "Every call into the library on this page is in the first three. The fourth is the empty slot in each section header that this site fills with a Code control, and the example leaves empty.",
    openByDefault: true,
    files: [
      file("src/application-form.tsx"),
      file("src/sections/address-fields.tsx"),
      file("src/sections/items-section.tsx"),
      file("src/section-source.tsx"),
    ],
  },
  {
    title: "The widgets",
    note: "The application's own Material components. They import one type from the library — FieldBinding — and nothing else from it.",
    openByDefault: false,
    files: [
      file("src/md/text-field.tsx"),
      file("src/md/number-field.tsx"),
      file("src/md/select-field.tsx"),
      file("src/md/checkbox-field.tsx"),
      file("src/md/choice-chips.tsx"),
      file("src/md/button.tsx"),
      file("src/md/section-card.tsx"),
      file("src/md/supporting-text.tsx"),
    ],
  },
  {
    title: "Mounting, styling and build",
    note: "The rest of the directory: the entry point, the two stylesheets, and the three files that build and type-check it.",
    openByDefault: false,
    files: [
      file("src/main.tsx"),
      file("index.html"),
      file("src/theme.css"),
      file("src/md3-tokens.css"),
      file("vite.config.ts"),
      file("tsconfig.check.json"),
      file("README.md"),
    ],
  },
];

// THE COMPLETENESS CHECK, run at build time because the claim on the page is
// "every file" and a claim like that is worth exactly what enforces it.
const listed = new Set(SOURCE.flatMap((g) => g.files.map((f) => f.path)));
const onDisk = Object.keys(RAW).map((k) => k.slice(PREFIX.length));
const missing = onDisk.filter((p) => !listed.has(p));
if (missing.length > 0) {
  throw new Error(
    `showcase-source: examples/showcase has files this page does not show — ` +
      `${missing.join(", ")}. Add them to a group, or the page's "every file" is false.`
  );
}

export const FILE_COUNT = listed.size;
export const LINE_COUNT = SOURCE.reduce(
  (n, g) => n + g.files.reduce((m, f) => m + f.lines, 0),
  0
);
