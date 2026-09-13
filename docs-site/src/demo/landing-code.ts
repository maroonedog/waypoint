// ===========================================================================
// landing-code.ts — the code the landing page shows, in one place.
//
// THE PROSE IS TRANSLATED AND THE CODE IS NOT, so the code lives where both
// pages can read it. A snippet retyped into a second file is a snippet that
// drifts, and a Japanese page quoting an older signature than the English one
// is worse than no Japanese page: the reader cannot tell which is current, and
// nothing on either page would announce the difference.
//
// What is NOT here is every sentence around them. A translation is written
// rather than substituted, so the titles and the notes belong to each page.
// ===========================================================================

/** The one command that gets you the library. */
export const clone = `git clone https://github.com/maroonedog/waypoint`;

/** The whole idea, in ten lines. */
export const whole = `
// 1. Any validator becomes a form description. One function, named by you.
const orderAdapter = zodFormResolver(orderSchema);

// 2. Its types, registered once for the whole application.
declare module "@maroonedog/waypoint" {
  interface WaypointForms { form: typeof orderAdapter }
}

// 3. Any component, any depth, no props, no import from the registry.
const field = useField("form:billing.postcode");   //  string | undefined
const typo  = useField("form:billing.postcod");    //  compile error
`.trim();

/** One of the six blocks under "in code". The prose around it is per-page. */
export interface LandingSnippet {
  readonly id: string;
  readonly lang: "ts" | "tsx";
  readonly code: string;
}

export const SNIPPETS: readonly LandingSnippet[] = [
  {
    id: "field",
    lang: "tsx",
    code: `const field = useField("form:owner.name");

<input {...field.inputProps} />
<em>{field.issues[0]?.message}</em>`,
  },
  {
    id: "list",
    lang: "tsx",
    code: `const items = useRows("form:items");

items.rows.map((row) => (
  <Sku key={row.key} at={\`\${row.path}.sku\`} />
))
items.insert(items.rows.length, { sku: "" });`,
  },
  {
    id: "cross-field",
    lang: "ts",
    code: `.superRefine((value, ctx) => {
  if (value.billing.postcode !== value.shipping.postcode) {
    ctx.addIssue({
      path: ["shipping", "postcode"],   // not the field being typed in
      message: "Does not match billing",
    });
  }
})`,
  },
  {
    id: "submit",
    lang: "ts",
    code: `const { submitted, blockedBy } = await form.submit(save);

// blockedBy carries every blocking issue, including
// paths with no component on screen.`,
  },
  {
    id: "uncontrolled",
    lang: "tsx",
    code: `const field = useUncontrolledField("form:owner.name");

<input defaultValue={field.defaultValue} ref={field.ref}
       onChange={field.onChange} onBlur={field.onBlur} />`,
  },
  {
    id: "participation",
    lang: "ts",
    code: `useParticipation(form, "form:shipping", !sameAsBilling);

// A rule comparing against it goes on reading it.`,
  },
];

/** The snippet with this id, or a build-time failure naming the id. */
export const snippet = (id: string): LandingSnippet => {
  const found = SNIPPETS.find((one) => one.id === id);
  if (found === undefined) {
    throw new Error(
      `landing-code.ts has no snippet "${id}". A page asked for one that is ` +
        `not in SNIPPETS — the ids are: ${SNIPPETS.map((one) => one.id).join(", ")}.`
    );
  }
  return found;
};
