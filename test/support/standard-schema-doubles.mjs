// Validators that no installable package is, which is the only way to test a
// spec rather than a vendor.
//
// `standardFormResolver` reads two members of a specification this package does
// not own, and the claim it makes is about the SPEC: implement those members
// and you are supported, whoever you are. A test against zod cannot make that
// claim — it shows the resolver works with the one set of choices zod made. The
// shapes worth pinning are the choices zod did not make: the three permitted
// issue-path spellings, a converter that throws, a converter that declares
// nothing at all, a vendor that answers only draft-07, and an async verdict.
// Those do not co-occur in any installed package, in any combination, so there
// is nothing to import and they are written out by hand.
//
// WHY THEY ARE IN ONE MODULE. There is no schema file for Standard Schema in
// this repository. These objects are the only executable statement of what this
// package requires of a validator, and a statement that exists in five copies
// is five statements — the next reader asking "what does a conforming vendor
// have to be?" would have to read all of them and diff. One copy makes the
// answer singular and gives a spec revision one place to land.
//
// `bothHalves` is a switchboard rather than a fixture for the same reason: its
// three knobs are the three axes the family explores, and a per-file copy would
// carry only the knob that file needed, leaving the next test that needs two of
// them to pick a copy to extend.

/** The document every describing double converts to. */
export const DOCUMENT = {
  type: "object",
  properties: {
    owner: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 3, title: "Full name" },
        nickname: { type: "string" },
      },
      required: ["name"],
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { sku: { type: "string", minLength: 2 } },
        required: ["sku"],
      },
    },
  },
  required: ["owner"],
};

/**
 * A validator carrying both halves, with whatever verdict a test needs.
 *
 * `asked` records the `target` of every call the resolver made to the
 * converter, in order. It is there because how many times the converter is
 * asked is not an implementation detail to some of these tests — it is the
 * premise. A retry means a converter that throws throws twice, and a test
 * about deduplicating the reason cannot state what it deduplicates without it.
 * The member sits outside `~standard`, so nothing the resolver reads changes.
 */
export const bothHalves = (issues = [], { target, throws } = {}) => {
  const asked = [];
  return {
    asked,
    "~standard": {
      version: 1,
      vendor: "example",
      validate: () => (issues.length === 0 ? { value: {} } : { issues }),
      jsonSchema: {
        input: (options) => {
          asked.push(options.target);
          if (throws !== undefined) throw new Error(throws);
          if (target !== undefined && options.target !== target) {
            throw new Error(`Unsupported JSON Schema target: ${options.target}`);
          }
          return DOCUMENT;
        },
      },
    },
  };
};

/** A validator that judges and says nothing about JSON Schema. */
export const validateOnly = (issues = []) => ({
  "~standard": {
    version: 1,
    vendor: "judge-only",
    validate: () => (issues.length === 0 ? { value: {} } : { issues }),
  },
});

/** A validator whose verdict is a promise, as `~standard.validate` permits. */
export const asyncSchema = (issues) => ({
  "~standard": {
    version: 1,
    vendor: "slow",
    validate: () =>
      Promise.resolve(issues.length === 0 ? { value: {} } : { issues }),
    jsonSchema: { input: () => DOCUMENT },
  },
});
